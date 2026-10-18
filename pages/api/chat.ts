import type { NextApiRequest, NextApiResponse } from 'next';
import { FieldValue } from 'firebase-admin/firestore';

import { authenticateRequest } from '@/lib/serverAuth';
import { saveThreadSnapshot } from '@/lib/chatPersistence';
import { enforceRateLimit } from '@/lib/rateLimiter';
import { logError, logInfo } from '@/lib/logger';
import { AppError, BadRequestError } from '@/lib/errors';
import { adminDb } from '@/lib/firebaseAdmin';
import { buildCharacterInstructions } from '@/lib/characterPrompt';
import { DEFAULT_PERSONA, getDefaultCharacter } from '@/lib/defaultCharacters';
import { generateReply, streamReply, type ChatTurn } from '@/lib/llm';
import { withLyricsGuard } from '@/lib/lyricsGuard';
import { CRISIS_REMINDER, looksLikeCrisis } from '@/lib/safety';
import { assertWithinMonthlyQuota, recordChatUsage, type TokenUsage } from '@/lib/usage';

const MAX_MESSAGE_LENGTH = 4000;
const HISTORY_LIMIT = 30;

type CharacterDocument = {
  name?: string;
  summary?: string | null;
  shortDescription?: string | null;
  greeting?: string | null;
  longDescription?: string | null;
  instructions?: string | null;
  example?: string | null;
  visibility?: string | null;
};

type ResponseMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date | null;
};

const sanitize = (value?: string | null) =>
  typeof value === 'string' ? value.trim() : '';

async function resolvePersonaInstructions(userId: string, characterId: string | null) {
  if (!characterId) {
    return { instructions: DEFAULT_PERSONA.instructions, origin: 'default' as const };
  }

  const builtIn = getDefaultCharacter(characterId);
  if (builtIn) {
    return { instructions: builtIn.instructions, origin: 'default' as const };
  }

  let snapshot = await adminDb
    .collection('users')
    .doc(userId)
    .collection('characters')
    .doc(characterId)
    .get();

  if (!snapshot.exists) {
    snapshot = await adminDb.collection('characters').doc(characterId).get();
  }

  // Public collection only ever holds public/unlisted characters, but guard anyway.
  const isForeign = snapshot.exists && snapshot.get('creatorId') !== userId;
  const isBlocked =
    isForeign && (snapshot.get('visibility') === 'private' || snapshot.get('hidden') === true);

  if (!snapshot.exists || isBlocked) {
    throw new BadRequestError('선택한 캐릭터를 찾을 수 없습니다.');
  }

  const data = snapshot.data() as CharacterDocument;
  const name = sanitize(data.name) || 'Custom character';
  const stored = sanitize(data.instructions);
  const example = sanitize(data.example);

  const instructions = stored
    ? example && !stored.includes(example)
      ? `${stored}\n\nExample of this persona's writing style (match the tone, do not copy it):\n${example}`
      : stored
    : buildCharacterInstructions({
        name,
        shortDescription: data.shortDescription ?? data.summary ?? null,
        greeting: data.greeting ?? null,
        longDescription: data.longDescription ?? null,
        example
      });

  return {
    instructions,
    origin: 'custom' as const,
    // Only other people's listed characters collect community usage stats.
    countsUsage:
      (data.visibility === 'public' || data.visibility === 'unlisted') &&
      snapshot.get('creatorId') !== userId
  };
}

async function loadHistory(userId: string, threadId: string): Promise<ResponseMessage[]> {
  const conversationRef = adminDb
    .collection('users')
    .doc(userId)
    .collection('conversations')
    .doc(threadId);

  const conversation = await conversationRef.get();
  if (!conversation.exists) {
    // Thread ids are only valid for the user who owns the conversation.
    throw new AppError('대화를 찾을 수 없습니다.', { statusCode: 404, code: 'THREAD_NOT_FOUND' });
  }

  const snapshot = await conversationRef
    .collection('messages')
    .orderBy('createdAt', 'desc')
    .limit(HISTORY_LIMIT)
    .get();

  return snapshot.docs
    .map(doc => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() ?? null;
      return {
        id: doc.id,
        role: data.role,
        content: typeof data.content === 'string' ? data.content : '',
        createdAt
      } as ResponseMessage;
    })
    .filter(item => (item.role === 'user' || item.role === 'assistant') && item.content)
    .reverse();
}

const newMessageId = (userId: string, threadId: string) =>
  adminDb
    .collection('users')
    .doc(userId)
    .collection('conversations')
    .doc(threadId)
    .collection('messages')
    .doc().id;

const wantsStream = (req: NextApiRequest) =>
  typeof req.headers.accept === 'string' && req.headers.accept.includes('text/event-stream');

const writeEvent = (res: NextApiResponse, event: string, payload: unknown) => {
  res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let streaming = false;

  try {
    const { user } = await authenticateRequest(req);
    await enforceRateLimit(user.uid);

    const { message, threadId, characterId } = (req.body ?? {}) as {
      message?: unknown;
      threadId?: unknown;
      characterId?: unknown;
    };

    const text = typeof message === 'string' ? message.trim() : '';
    if (!text) {
      throw new BadRequestError('Message is required.');
    }
    if (text.length > MAX_MESSAGE_LENGTH) {
      throw new BadRequestError(`메시지는 ${MAX_MESSAGE_LENGTH}자 이하로 입력해 주세요.`);
    }

    const resolvedCharacterId =
      typeof characterId === 'string' && characterId.trim() ? characterId.trim() : null;
    const requestedThreadId =
      typeof threadId === 'string' && threadId.trim() ? threadId.trim() : null;

    const quota = await assertWithinMonthlyQuota(user.uid);

    const persona = await resolvePersonaInstructions(user.uid, resolvedCharacterId);
    const history = requestedThreadId ? await loadHistory(user.uid, requestedThreadId) : [];
    const currentThreadId =
      requestedThreadId ??
      adminDb.collection('users').doc(user.uid).collection('conversations').doc().id;

    const guarded = withLyricsGuard(persona.instructions, text);
    const crisisSignal = looksLikeCrisis(text);
    const instructions = crisisSignal ? `${guarded.instructions}\n\n${CRISIS_REMINDER}` : guarded.instructions;

    logInfo('chat.request', {
      uid: user.uid,
      threadId: currentThreadId,
      characterId: resolvedCharacterId,
      personaOrigin: persona.origin,
      historyLength: history.length,
      // Looks like a request for an existing song's lyrics (message text itself is not logged).
      existingLyricsRequest: guarded.flagged,
      // Counted to watch how often people reach out in crisis; the text itself is never logged.
      crisisSignal
    });

    const userCreatedAt = new Date();
    const userMessage: ResponseMessage = {
      id: newMessageId(user.uid, currentThreadId),
      role: 'user',
      content: text,
      createdAt: userCreatedAt
    };
    const turns: ChatTurn[] = [...history, userMessage].map(item => ({
      role: item.role,
      content: item.content
    }));

    let replyText = '';
    let tokenUsage: TokenUsage | null = null;
    const captureUsage = (usage: TokenUsage) => {
      tokenUsage = usage;
    };

    if (wantsStream(req)) {
      streaming = true;
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders?.();

      for await (const delta of streamReply(instructions, turns, captureUsage)) {
        replyText += delta;
        writeEvent(res, 'delta', { text: delta });
      }
      replyText = replyText.trim();
    } else {
      replyText = await generateReply(instructions, turns, captureUsage);
    }

    if (!replyText) {
      throw new AppError('AI가 응답을 생성하지 못했습니다. 다시 시도해 주세요.', {
        statusCode: 502,
        code: 'EMPTY_REPLY'
      });
    }

    const assistantMessage: ResponseMessage = {
      id: newMessageId(user.uid, currentThreadId),
      role: 'assistant',
      content: replyText,
      // Keep ordering stable when both messages land in the same millisecond.
      createdAt: new Date(Math.max(Date.now(), userCreatedAt.getTime() + 1))
    };

    await saveThreadSnapshot({
      user,
      threadId: currentThreadId,
      messages: [userMessage, assistantMessage].map(item => ({
        ...item,
        characterId: resolvedCharacterId
      })),
      characterId: resolvedCharacterId
    });

    await recordChatUsage(user.uid, tokenUsage).catch(usageError =>
      logError('chat.usage_record_failed', usageError)
    );

    if (!requestedThreadId && resolvedCharacterId && 'countsUsage' in persona && persona.countsUsage) {
      await adminDb
        .collection('characters')
        .doc(resolvedCharacterId)
        .update({ useCount: FieldValue.increment(1) })
        .catch(() => undefined);
    }

    logInfo('chat.success', {
      uid: user.uid,
      threadId: currentThreadId,
      personaOrigin: persona.origin
    });

    const payload = {
      threadId: currentThreadId,
      messages: [...history, userMessage, assistantMessage],
      reply: assistantMessage,
      usage: quota
    };

    if (streaming) {
      writeEvent(res, 'done', payload);
      return res.end();
    }

    return res.status(200).json(payload);
  } catch (error) {
    const appError =
      error instanceof AppError
        ? error
        : new AppError('Unexpected error while contacting the assistant.', {
            statusCode: 500,
            code: 'INTERNAL_SERVER_ERROR'
          });

    if (error instanceof AppError) {
      logError('chat.app_error', error, { statusCode: error.statusCode, code: error.code });
    } else {
      logError('chat.unexpected_error', error);
    }

    if (streaming) {
      writeEvent(res, 'error', { error: appError.message, code: appError.code });
      return res.end();
    }

    return res.status(appError.statusCode).json({
      error: appError.message,
      code: appError.code
    });
  }
}
