import type { NextApiRequest, NextApiResponse } from 'next';

import { DEFAULT_PERSONA, getDefaultCharacter } from '@/lib/defaultCharacters';
import { clientIp } from '@/lib/clientIp';
import { AppError, BadRequestError } from '@/lib/errors';
import { generateReply, withoutPlaceholders } from '@/lib/llm';
import { logError, logInfo } from '@/lib/logger';
import { withLyricsGuard } from '@/lib/lyricsGuard';
import { CRISIS_REMINDER, looksLikeCrisis } from '@/lib/safety';
import {
  TRIAL_MAX_MESSAGE,
  cleanupTrialUsage,
  consumeTrialMessage,
  sanitizeTrialHistory
} from '@/lib/trial';

// POST { message, history?, adult: true } -> { reply, remaining, crisis }
// No-signup trial with Dayeon (lib/trial.ts). Nothing is stored; the browser keeps the history.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = (req.body ?? {}) as { message?: unknown; history?: unknown; adult?: unknown };
    // The service is for adults only (terms 제4조), so the visitor must confirm it before trying.
    if (body.adult !== true) {
      throw new AppError('만 19세 이상만 이용할 수 있어요.', { statusCode: 403, code: 'AGE_CONFIRMATION_REQUIRED' });
    }
    const text = typeof body.message === 'string' ? body.message.trim() : '';
    if (!text) {
      throw new BadRequestError('메시지를 입력해 주세요.');
    }
    if (text.length > TRIAL_MAX_MESSAGE) {
      throw new BadRequestError(`체험에서는 ${TRIAL_MAX_MESSAGE}자까지 보낼 수 있어요.`);
    }

    const { remaining } = await consumeTrialMessage(clientIp(req));
    if (Math.random() < 0.05) {
      void cleanupTrialUsage();
    }

    // Same persona as the member chat with Dayeon (characterId 1).
    const persona = getDefaultCharacter('1') ?? DEFAULT_PERSONA;
    const guarded = withLyricsGuard(persona.instructions, text);
    const crisis = looksLikeCrisis(text);
    const instructions = crisis ? `${guarded.instructions}\n\n${CRISIS_REMINDER}` : guarded.instructions;
    const turns = [...sanitizeTrialHistory(body.history), { role: 'user' as const, content: text }];

    const reply = await withoutPlaceholders(instructions, turns, await generateReply(instructions, turns));
    if (!reply) {
      throw new AppError('AI가 응답하지 못했어요. 다시 시도해 주세요.', { statusCode: 502, code: 'EMPTY_REPLY' });
    }

    logInfo('trial.message', { remaining, historyLength: turns.length - 1, existingLyricsRequest: guarded.flagged, crisis });
    return res.status(200).json({ reply, remaining, crisis });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    logError('trial.unexpected_error', error);
    return res.status(500).json({ error: '잠시 후 다시 시도해 주세요.' });
  }
}
