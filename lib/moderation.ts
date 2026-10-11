import OpenAI from 'openai';

import { BadRequestError } from '@/lib/errors';
import { logWarn } from '@/lib/logger';

// Screens user-generated text that becomes visible to other users (public/unlisted characters).
// Fails open when the moderation API is unavailable so creators are not blocked by an outage.

let client: OpenAI | null = null;

function getClient() {
  const apiKey = process.env.APPSECRETS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  client ??= new OpenAI({ apiKey });
  return client;
}

export async function assertPublishable(texts: Array<string | null | undefined>) {
  const input = texts
    .map(text => (typeof text === 'string' ? text.trim() : ''))
    .filter(Boolean)
    .join('\n\n');

  const openai = getClient();
  if (!input || !openai) {
    return;
  }

  let flagged = false;
  try {
    const result = await openai.moderations.create({
      model: 'omni-moderation-latest',
      input
    });
    flagged = result.results.some(item => item.flagged);
  } catch (error) {
    logWarn('moderation.unavailable', {
      message: error instanceof Error ? error.message : String(error)
    });
    return;
  }

  if (flagged) {
    throw new BadRequestError(
      '공개할 수 없는 내용이 포함되어 있습니다. 내용을 수정하거나 비공개로 저장해 주세요.'
    );
  }
}
