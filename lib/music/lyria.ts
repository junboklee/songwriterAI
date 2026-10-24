// Song generation with Google Lyria 3 on Vertex AI (interactions API, Public Preview, global only).
// Calls run as the App Hosting runtime service account (roles/aiplatform.user) through Application
// Default Credentials. Google's terms (Service Specific Terms §20(d)) forbid this in services likely
// used by under-18s, which is why the service is adults-only (lib/age.ts).
import { GoogleAuth } from 'google-auth-library';

import { AppError } from '@/lib/errors';
import { logWarn } from '@/lib/logger';

export const LYRIA_MODELS = {
  clip: 'lyria-3-clip-preview',
  full: 'lyria-3-pro-preview'
} as const;
export type SongLength = keyof typeof LYRIA_MODELS;

export const MAX_SUNG_LYRICS = 3000;
const DEFAULT_STYLE = 'Warm Korean pop ballad, clear expressive vocal, piano and strings';
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'character-ai-12ae8';

// Style first (English keywords work best), then the lyrics to be sung word for word. This is the
// format that sang every line of the Korean test clips correctly (2026-10-21 test).
export function buildLyriaPrompt(style: string | null | undefined, lyrics: string) {
  const styleText = (style ?? '').trim().replace(/[.\s]+$/, '') || DEFAULT_STYLE;
  return `${styleText}. Sing these Korean lyrics exactly as written:\n${lyrics.trim()}`;
}

type LyriaOutput = { type?: string; text?: string; data?: string; mime_type?: string; mimeType?: string };

export type LyriaResult = {
  audio: Buffer;
  mimeType: string;
  model: string;
  // What Lyria says it sang (timed lyrics) and its description of the track, when returned.
  sungLyrics: string | null;
  caption: string | null;
};

// Pulls the audio and text parts out of an interactions response.
export function parseLyriaResponse(body: { outputs?: LyriaOutput[] }, model: string): LyriaResult | null {
  const outputs = body.outputs ?? [];
  const audioPart = outputs.find(out => out.data && (out.mime_type ?? out.mimeType ?? '').startsWith('audio'));
  if (!audioPart?.data) {
    return null;
  }
  const texts = outputs.filter(out => out !== audioPart && typeof out.text === 'string').map(out => out.text as string);
  return {
    audio: Buffer.from(audioPart.data, 'base64'),
    mimeType: audioPart.mime_type ?? audioPart.mimeType ?? 'audio/mpeg',
    model,
    sungLyrics: texts.find(text => text.includes('\n')) ?? null,
    caption: texts.find(text => !text.includes('\n')) ?? null
  };
}

let auth: GoogleAuth | null = null;
const accessToken = async () => {
  auth ??= new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  const token = await auth.getAccessToken();
  if (!token) {
    throw new Error('No Google access token');
  }
  return token;
};

export async function generateSong({
  length,
  style,
  lyrics
}: {
  length: SongLength;
  style?: string | null;
  lyrics: string;
}): Promise<LyriaResult> {
  const model = LYRIA_MODELS[length];
  const response = await fetch(
    `https://aiplatform.googleapis.com/v1beta1/projects/${PROJECT_ID}/locations/global/interactions`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ model, input: [{ type: 'text', text: buildLyriaPrompt(style, lyrics) }] })
    }
  );
  const body = await response.json().catch(() => ({}));
  const result = response.ok ? parseLyriaResponse(body, model) : null;
  if (!result) {
    const reason = typeof body?.error?.message === 'string' ? body.error.message : `status ${response.status}`;
    logWarn('music.lyria_failed', { model, status: response.status, reason: reason.slice(0, 300) });
    // Lyria refuses some prompts for unexplained "policy" reasons; a retry often works.
    throw new AppError('노래를 만들지 못했어요. 잠시 후 다시 시도해 주세요.', {
      statusCode: 502,
      code: /policy|safety|block/i.test(reason) ? 'MUSIC_BLOCKED' : 'MUSIC_FAILED'
    });
  }
  return result;
}
