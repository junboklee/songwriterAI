import type { NextApiRequest, NextApiResponse } from 'next';
import { Timestamp } from 'firebase-admin/firestore';
import OpenAI from 'openai';

import { authenticateRequest } from '@/lib/serverAuth';
import { saveThreadSnapshot } from '@/lib/chatPersistence';
import { enforceRateLimit } from '@/lib/rateLimiter';
import { logError, logInfo } from '@/lib/logger';
import { AppError, BadRequestError } from '@/lib/errors';
import { adminDb } from '@/lib/firebaseAdmin';
import { createCharacterAssistant } from '@/lib/characterAssistants';

const openai = new OpenAI({
  apiKey: process.env.APPSECRETS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY
});

const defaultAssistantId =
  process.env.APPSECRETS_OPENAI_ASSISTANT_ID ?? process.env.OPENAI_ASSISTANT_ID ?? null;

type CharacterDocument = {
  name?: string;
  summary?: string | null;
  greeting?: string | null;
  instructions?: string | null;
  example?: string | null;
  assistantId?: string | null;
};

type ResolvedAssistantContext = {
  assistantId: string;
  characterName?: string | null;
  greeting?: string | null;
  origin: 'default' | 'custom';
};

const wait = (ms: number) =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });

const sanitize = (value?: string | null) =>
  typeof value === 'string' ? value.trim() : '';

async function pollRunCompletion(threadId: string, runId: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);

    if (run.status === 'completed') {
      return run;
    }

    if (run.status === 'requires_action') {
      throw new Error('Assistant requested an unsupported action.');
    }

    if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
      throw new Error(run.last_error?.message || `Run ended with status ${run.status}`);
    }

    await wait(1500);
  }

  throw new Error('Timed out waiting for assistant response.');
}

async function resolveAssistantContext(
  userId: string,
  characterId?: string | null
): Promise<ResolvedAssistantContext> {
  if (!characterId) {
    if (!defaultAssistantId) {
      throw new AppError('Assistant configuration is missing.', {
        statusCode: 500,
        code: 'ASSISTANT_NOT_CONFIGURED'
      });
    }

    return {
      assistantId: defaultAssistantId,
      origin: 'default'
    };
  }

  const characterRef = adminDb.collection('users').doc(userId).collection('characters').doc(characterId);
  const snapshot = await characterRef.get();

  if (!snapshot.exists) {
    if (!defaultAssistantId) {
      throw new BadRequestError('선택한 캐릭터를 찾을 수 없습니다.');
    }

    return {
      assistantId: defaultAssistantId,
      origin: 'default'
    };
  }

  const data = snapshot.data() as CharacterDocument;

  let assistantId =
    typeof data.assistantId === 'string' && data.assistantId.trim()
      ? data.assistantId.trim()
      : '';

  const name = sanitize(data.name) || 'Custom character';
  const summary = sanitize(data.summary ?? undefined);
  const greeting = sanitize(data.greeting ?? undefined);
  const instructions = sanitize(data.instructions ?? undefined);
  const example = sanitize(data.example ?? undefined);

  if (!assistantId) {
    if (!instructions) {
      throw new AppError('캐릭터 지침이 비어 있습니다. 먼저 캐릭터 설정을 저장해주세요.', {
        statusCode: 422,
        code: 'ASSISTANT_NOT_READY'
      });
    }

    try {
      assistantId = await createCharacterAssistant({
        userId,
        characterId,
        name,
        summary,
        greeting,
        instructions,
        example
      });

      await characterRef.set(
        {
          assistantId,
          updatedAt: Timestamp.now()
        },
        { merge: true }
      );
    } catch (assistantError) {
      logError('chat.assistant_sync_failed', assistantError);
      throw new AppError('커스텀 캐릭터 assistant를 준비하지 못했습니다. 잠시 후 다시 시도해주세요.', {
        statusCode: 502,
        code: 'ASSISTANT_SYNC_FAILED'
      });
    }
  }

  return {
    assistantId,
    characterName: name,
    greeting,
    origin: 'custom'
  };
}

const parseMessageContent = (message: OpenAI.Beta.Threads.Messages.Message) =>
  message.content
    .filter((item): item is OpenAI.Beta.Threads.Messages.TextContentBlock => item.type === 'text')
    .map(item => item.text.value)
    .join('\n')
    .trim();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user } = await authenticateRequest(req);

    enforceRateLimit(user.uid);

    const { message, threadId, characterId, songDraft } = req.body as {
      message?: string;
      threadId?: string;
      characterId?: string;
      songDraft?: unknown;
    };

    if (!message || !message.trim()) {
      throw new BadRequestError('Message is required.');
    }

    const assistantContext = await resolveAssistantContext(user.uid, characterId ?? null);

    logInfo('chat.request', {
      uid: user.uid,
      threadId: threadId ?? null,
      characterId: characterId ?? null,
      assistantOrigin: assistantContext.origin
    });

    let currentThreadId = threadId;

    if (!currentThreadId) {
      const thread = await openai.beta.threads.create();
      currentThreadId = thread.id;
    }

    await openai.beta.threads.messages.create(currentThreadId, {
      role: 'user',
      content: message
    });

    const run = await openai.beta.threads.runs.create(currentThreadId, {
      assistant_id: assistantContext.assistantId
    });

    await pollRunCompletion(currentThreadId, run.id);

    const responseMessages = await openai.beta.threads.messages.list(currentThreadId, {
      limit: 10
    });

    const orderedMessages = [...responseMessages.data].reverse().map(item => {
      const createdAt =
        typeof item.created_at === 'number' ? new Date(item.created_at * 1000) : null;

      return {
        id: item.id,
        role: item.role,
        content: parseMessageContent(item),
        createdAt
      };
    });

    const persistedMessages = orderedMessages
      .filter(
        (
          messageItem
        ): messageItem is {
          id: string;
          role: 'user' | 'assistant';
          content: string;
          createdAt: Date | null;
        } =>
          (messageItem.role === 'user' || messageItem.role === 'assistant') &&
          Boolean(messageItem.content)
      )
      .map(messageItem => ({
        id: messageItem.id,
        role: messageItem.role,
        content: messageItem.content,
        createdAt: messageItem.createdAt,
        characterId: characterId ?? null
      }));

    let normalizedSongDraft: {
      id?: string;
      title?: string | null;
      lyrics?: string | null;
      prompt?: string | null;
      metadata?: Record<string, unknown> | null;
      characterId?: string | null;
    } | null = null;

    if (songDraft && typeof songDraft === 'object') {
      const draftRecord = songDraft as Record<string, unknown>;
      normalizedSongDraft = {
        id: typeof draftRecord.id === 'string' && draftRecord.id.trim() ? draftRecord.id : undefined,
        title:
          typeof draftRecord.title === 'string' && draftRecord.title.trim()
            ? draftRecord.title.trim()
            : null,
        lyrics:
          typeof draftRecord.lyrics === 'string' && draftRecord.lyrics.trim()
            ? draftRecord.lyrics.trim()
            : null,
        prompt:
          typeof draftRecord.prompt === 'string' && draftRecord.prompt.trim()
            ? draftRecord.prompt.trim()
            : null,
        metadata:
          draftRecord.metadata && typeof draftRecord.metadata === 'object'
            ? (draftRecord.metadata as Record<string, unknown>)
            : null,
        characterId:
          typeof draftRecord.characterId === 'string' && draftRecord.characterId.trim()
            ? draftRecord.characterId.trim()
            : characterId ?? null
      };
    }

    await saveThreadSnapshot({
      user,
      threadId: currentThreadId,
      messages: persistedMessages,
      characterId: characterId ?? null,
      songDraft: normalizedSongDraft ?? undefined
    });

    logInfo('chat.success', {
      uid: user.uid,
      threadId: currentThreadId,
      messageCount: persistedMessages.length,
      assistantOrigin: assistantContext.origin
    });

    const lastAssistantMessage =
      [...orderedMessages]
        .reverse()
        .find(entry => entry.role === 'assistant' && entry.content.length > 0) ?? null;

    return res.status(200).json({
      threadId: currentThreadId,
      messages: orderedMessages,
      reply: lastAssistantMessage,
      user
    });
  } catch (error) {
    if (error instanceof AppError) {
      logError('chat.app_error', error, {
        statusCode: error.statusCode,
        code: error.code
      });

      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code
      });
    }

    logError('chat.unexpected_error', error);

    return res.status(500).json({
      error: 'Unexpected error while contacting the assistant.',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
}
