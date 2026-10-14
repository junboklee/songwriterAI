import type { NextApiRequest, NextApiResponse } from 'next';

import { AppError, BadRequestError } from '@/lib/errors';
import { completeText } from '@/lib/llm';
import { logError } from '@/lib/logger';
import {
  MAX_REWRITE_INSTRUCTION,
  MAX_REWRITE_LYRICS,
  MAX_REWRITE_SELECTION,
  REWRITE_INSTRUCTIONS,
  buildRewriteInput,
  parseRewrite,
  restoreSectionTags,
  splitSectionTags
} from '@/lib/lyricsRewrite';
import { enforceRateLimit } from '@/lib/rateLimiter';
import { requireUser } from '@/lib/serverAuth';
import { assertWithinMonthlyQuota, recordChatUsage, type TokenUsage } from '@/lib/usage';

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

// POST { lyrics, selection, instruction, style? } -> { replacement }
// Counts as one AI request for rate limiting and the monthly quota, like a chat message.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await requireUser(req);
    await enforceRateLimit(user.uid);

    const body = (req.body ?? {}) as Record<string, unknown>;
    const lyrics = text(body.lyrics);
    const selection = typeof body.selection === 'string' ? body.selection.replace(/^\n+|\s+$/g, '') : '';
    const instruction = text(body.instruction);
    const style = text(body.style) || null;

    if (!lyrics || !selection || !instruction) {
      throw new BadRequestError('가사, 바꿀 부분, 요청 내용이 모두 필요합니다.');
    }
    if (
      lyrics.length > MAX_REWRITE_LYRICS ||
      selection.length > MAX_REWRITE_SELECTION ||
      instruction.length > MAX_REWRITE_INSTRUCTION
    ) {
      throw new BadRequestError('선택한 부분이나 요청 내용이 너무 깁니다.');
    }

    const { lines: selectedLines, contentText, contentCount } = splitSectionTags(selection);
    if (contentCount === 0) {
      throw new BadRequestError('가사 줄을 선택해 주세요. 섹션 태그만으로는 다시 쓸 수 없습니다.');
    }

    const quota = await assertWithinMonthlyQuota(user.uid);

    let usage: TokenUsage | null = null;
    const output = await completeText(
      REWRITE_INSTRUCTIONS,
      buildRewriteInput({ lyrics, selection: contentText, instruction, style }),
      captured => {
        usage = captured;
      }
    );
    const rewritten = parseRewrite(output);
    const replacement = rewritten ? restoreSectionTags(selectedLines, rewritten) : '';

    await recordChatUsage(user.uid, usage).catch(usageError => logError('rewrite.usage_record_failed', usageError));

    if (!replacement) {
      throw new AppError('다시 쓴 결과를 만들지 못했습니다. 다시 시도해 주세요.', { statusCode: 502, code: 'EMPTY_REPLY' });
    }

    return res.status(200).json({ replacement, usage: quota });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    logError('rewrite.unexpected_error', error);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}
