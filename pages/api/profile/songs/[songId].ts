import type { NextApiRequest, NextApiResponse } from 'next';

import { adminDb } from '@/lib/firebaseAdmin';
import { AgeConfirmationRequiredError } from '@/lib/errors';
import { requireUser, UnauthorizedError } from '@/lib/serverAuth';
import {
  appendSongVersion,
  deleteSongDeep,
  MAX_VERSIONS_PER_SONG,
  serializeSong,
  serializeVersion,
  shareSong,
  unshareSong
} from '@/lib/songVersions';

type PatchPayload = {
  title?: unknown;
  lyrics?: unknown;
  style?: unknown;
  restoreVersionId?: unknown;
  share?: unknown;
  aiAssisted?: unknown;
  aiLines?: unknown;
};

const MAX_AI_LINES = 200;

// Keeps only AI-rewritten lines that are really in the saved lyrics.
const sanitizeAiLines = (value: unknown, lyrics: string) => {
  if (!Array.isArray(value)) {
    return [];
  }
  const present = new Set(lyrics.split(/\r?\n/).map(line => line.trim()));
  const lines = value
    .filter((line): line is string => typeof line === 'string')
    .map(line => line.trim())
    .filter(line => line && present.has(line));
  return Array.from(new Set(lines)).slice(0, MAX_AI_LINES);
};

const MAX_LYRICS_LENGTH = 20_000;

const optionalString = (value: unknown) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const allowed = ['GET', 'PATCH', 'DELETE'];
  if (!allowed.includes(req.method ?? '')) {
    res.setHeader('Allow', allowed.join(', '));
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const songId = Array.isArray(req.query.songId) ? req.query.songId[0] : req.query.songId;
  if (!songId) {
    return res.status(400).json({ error: 'songId is required.' });
  }

  try {
    const authUser = await requireUser(req);
    const songRef = adminDb.collection('users').doc(authUser.uid).collection('songs').doc(songId);
    const songSnap = await songRef.get();

    if (!songSnap.exists) {
      return res.status(404).json({ error: 'Song not found.' });
    }

    if (req.method === 'DELETE') {
      await deleteSongDeep(songRef);
      return res.status(204).end();
    }

    if (req.method === 'PATCH') {
      const payload = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {}) as PatchPayload;
      const current = songSnap.data() ?? {};
      const restoreVersionId = optionalString(payload.restoreVersionId);

      if (typeof payload.share === 'boolean') {
        if (payload.share) {
          await shareSong(authUser.uid, songRef);
        } else {
          await unshareSong(songRef);
        }
      } else if (restoreVersionId) {
        const versionSnap = await songRef.collection('versions').doc(restoreVersionId).get();
        if (!versionSnap.exists) {
          return res.status(404).json({ error: 'Version not found.' });
        }
        const version = versionSnap.data() ?? {};
        await appendSongVersion(songRef, {
          title: version.title ?? null,
          lyrics: version.lyrics ?? '',
          style: version.style ?? null,
          source: 'restore'
        });
      } else {
        const lyrics =
          typeof payload.lyrics === 'string' ? payload.lyrics.trim() : (current.lyrics as string) ?? '';
        if (!lyrics) {
          return res.status(400).json({ error: 'lyrics is required.' });
        }
        if (lyrics.length > MAX_LYRICS_LENGTH) {
          return res.status(400).json({ error: `lyrics must be ${MAX_LYRICS_LENGTH} characters or fewer.` });
        }
        const title = payload.title === undefined ? current.title ?? null : optionalString(payload.title);
        const style =
          payload.style === undefined ? current.metadata?.style ?? null : optionalString(payload.style);

        const aiLines = sanitizeAiLines(payload.aiLines, lyrics);
        await appendSongVersion(songRef, {
          title,
          lyrics,
          style,
          source: 'manual',
          aiAssisted: payload.aiAssisted === true || aiLines.length > 0,
          aiLines
        });
      }
    }

    const [latest, versions] = await Promise.all([
      songRef.get(),
      songRef.collection('versions').orderBy('createdAt', 'desc').limit(MAX_VERSIONS_PER_SONG).get()
    ]);

    return res.status(200).json({
      song: serializeSong(latest.id, latest.data() ?? {}),
      versions: versions.docs.map(doc => serializeVersion(doc.id, doc.data()))
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message });
    }
    if (error instanceof AgeConfirmationRequiredError) {
      return res.status(403).json({ error: error.message, code: error.code });
    }
    console.error('Song API error:', error);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}
