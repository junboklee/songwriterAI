import type { NextApiRequest, NextApiResponse } from 'next';

import { authenticateRequest } from '@/lib/serverAuth';
import { enforceRateLimit } from '@/lib/rateLimiter';
import { saveThreadSnapshot } from '@/lib/chatPersistence';
import { generateReply, streamReply } from '@/lib/llm';
import { loadSongMemory } from '@/lib/songMemory';
import { assertWithinMonthlyQuota, recordChatUsage } from '@/lib/usage';
import { AppError } from '@/lib/errors';
import handler from '@/pages/api/chat';

jest.mock('@/lib/serverAuth');
jest.mock('@/lib/rateLimiter');
jest.mock('@/lib/chatPersistence');
jest.mock('@/lib/songMemory', () => ({ MEMORY_MAX_HISTORY: 2, loadSongMemory: jest.fn().mockResolvedValue('') }));
jest.mock('@/lib/llm', () => ({
  generateReply: jest.fn(),
  streamReply: jest.fn()
}));
jest.mock('@/lib/usage', () => ({
  assertWithinMonthlyQuota: jest.fn(async () => undefined),
  recordChatUsage: jest.fn(async () => undefined)
}));
jest.mock('@/lib/logger', () => ({
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn()
}));

type StoredMessage = { id: string; role: string; content: string; createdAt: Date };

const firestoreState: {
  conversations: Record<string, StoredMessage[]>;
} = { conversations: {} };

let idCounter = 0;

jest.mock('@/lib/firebaseAdmin', () => {
  const conversationDoc = (threadId?: string) => {
    const id = threadId ?? `generated-${(idCounter += 1)}`;
    return {
      id,
      get: jest.fn(async () => ({ exists: Boolean(firestoreState.conversations[id]) })),
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({ id: `msg-${(idCounter += 1)}` })),
        orderBy: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn(async () => ({
              docs: [...(firestoreState.conversations[id] ?? [])].reverse().map(message => ({
                id: message.id,
                data: () => ({
                  role: message.role,
                  content: message.content,
                  createdAt: { toDate: () => message.createdAt }
                })
              }))
            }))
          }))
        }))
      }))
    };
  };

  return {
    adminDb: {
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          collection: jest.fn(() => ({ doc: jest.fn(conversationDoc) }))
        }))
      }))
    }
  };
});

type MockResponse = NextApiResponse & {
  status: jest.Mock;
  json: jest.Mock;
  setHeader: jest.Mock;
  write: jest.Mock;
  end: jest.Mock;
};

const authenticateRequestMock = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;
const enforceRateLimitMock = enforceRateLimit as jest.MockedFunction<typeof enforceRateLimit>;
const saveThreadSnapshotMock = saveThreadSnapshot as jest.MockedFunction<typeof saveThreadSnapshot>;
const generateReplyMock = generateReply as jest.MockedFunction<typeof generateReply>;
const streamReplyMock = streamReply as jest.MockedFunction<typeof streamReply>;
const quotaMock = assertWithinMonthlyQuota as jest.MockedFunction<typeof assertWithinMonthlyQuota>;
const recordUsageMock = recordChatUsage as jest.MockedFunction<typeof recordChatUsage>;

const createRequest = (body: Record<string, unknown>, headers: Record<string, string> = {}) =>
  ({
    method: 'POST',
    headers,
    body,
    cookies: {},
    query: {},
    socket: { remoteAddress: '127.0.0.1' }
  } as unknown as NextApiRequest);

const createResponse = (): MockResponse => {
  const res: Partial<MockResponse> = {};
  res.status = jest.fn().mockImplementation(() => res as MockResponse);
  res.json = jest.fn().mockImplementation(() => res as MockResponse);
  res.setHeader = jest.fn();
  res.write = jest.fn();
  res.end = jest.fn();
  return res as MockResponse;
};

describe('/api/chat handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    firestoreState.conversations = {};
    authenticateRequestMock.mockResolvedValue({
      user: { uid: 'user-1', email: 'test@example.com' },
      idToken: 'token'
    });
    enforceRateLimitMock.mockResolvedValue(undefined);
    saveThreadSnapshotMock.mockResolvedValue(undefined);
    generateReplyMock.mockImplementation(async (_persona, _turns, onUsage) => {
      onUsage?.({ inputTokens: 120, outputTokens: 40 });
      return 'Here is your lyric idea.';
    });
  });

  it('stops before calling the model when the monthly quota is used up', async () => {
    quotaMock.mockRejectedValueOnce(
      new AppError('limit', { statusCode: 429, code: 'MONTHLY_QUOTA_EXCEEDED' })
    );
    const res = createResponse();

    await handler(createRequest({ message: 'hi' }), res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(generateReplyMock).not.toHaveBeenCalled();
  });

  it('records token usage after a successful reply', async () => {
    await handler(createRequest({ message: 'hi' }), createResponse());

    expect(recordUsageMock).toHaveBeenCalledWith('user-1', { inputTokens: 120, outputTokens: 40 });
  });

  it('returns 400 when message is missing', async () => {
    const res = createResponse();

    await handler(createRequest({}), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Message is required.', code: 'BAD_REQUEST' })
    );
    expect(generateReplyMock).not.toHaveBeenCalled();
  });

  it('rate limits per user id, not per forwarded IP', async () => {
    const res = createResponse();

    await handler(
      createRequest({ message: 'hi' }, { 'x-forwarded-for': '1.2.3.4' }),
      res
    );

    expect(enforceRateLimitMock).toHaveBeenCalledWith('user-1');
  });

  it('starts a new conversation, persists both messages and returns the reply', async () => {
    const res = createResponse();

    await handler(createRequest({ message: 'Write something upbeat.' }), res);

    expect(generateReplyMock).toHaveBeenCalledWith(
      expect.stringContaining('Nova'),
      [{ role: 'user', content: 'Write something upbeat.' }],
      expect.any(Function)
    );

    const saved = saveThreadSnapshotMock.mock.calls[0][0];
    expect(saved.threadId).toMatch(/^generated-/);
    expect(saved.messages.map(message => [message.role, message.content])).toEqual([
      ['user', 'Write something upbeat.'],
      ['assistant', 'Here is your lyric idea.']
    ]);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: saved.threadId,
        reply: expect.objectContaining({ role: 'assistant', content: 'Here is your lyric idea.' })
      })
    );
  });

  it('rejects a threadId that does not belong to the caller', async () => {
    const res = createResponse();

    await handler(createRequest({ message: 'hi', threadId: 'someone-elses-thread' }), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'THREAD_NOT_FOUND' }));
    expect(generateReplyMock).not.toHaveBeenCalled();
    expect(saveThreadSnapshotMock).not.toHaveBeenCalled();
  });

  it('sends stored history to the model for an existing conversation', async () => {
    firestoreState.conversations['thread-1'] = [
      { id: 'm1', role: 'user', content: '첫 질문', createdAt: new Date(1) },
      { id: 'm2', role: 'assistant', content: '첫 답변', createdAt: new Date(2) }
    ];
    const res = createResponse();

    await handler(createRequest({ message: '이어서', threadId: 'thread-1' }), res);

    expect(generateReplyMock).toHaveBeenCalledWith(
      expect.any(String),
      [
        { role: 'user', content: '첫 질문' },
        { role: 'assistant', content: '첫 답변' },
        { role: 'user', content: '이어서' }
      ],
      expect.any(Function)
    );
    expect(saveThreadSnapshotMock.mock.calls[0][0].threadId).toBe('thread-1');
  });

  it('streams deltas as server-sent events when requested', async () => {
    streamReplyMock.mockImplementation(async function* () {
      yield 'Hel';
      yield 'lo';
    });
    const res = createResponse();

    await handler(createRequest({ message: 'hi' }, { accept: 'text/event-stream' }), res);

    const written = res.write.mock.calls.map(call => call[0] as string);
    expect(written[0]).toBe('event: delta\ndata: {"text":"Hel"}\n\n');
    expect(written[1]).toBe('event: delta\ndata: {"text":"lo"}\n\n');
    expect(written[2]).toContain('event: done');
    expect(written[2]).toContain('"content":"Hello"');
    expect(res.end).toHaveBeenCalled();
    expect(saveThreadSnapshotMock).toHaveBeenCalled();
  });

  it('reminds the model not to reproduce lyrics when an existing song is requested', async () => {
    await handler(createRequest({ message: '밤편지 원곡 가사 알려줘' }), createResponse());

    expect(generateReplyMock.mock.calls[0][0]).toContain('# Reminder for this turn');
  });

  it('leaves ordinary songwriting requests unchanged', async () => {
    await handler(createRequest({ message: '이별 노래 가사 써줘' }), createResponse());

    expect(generateReplyMock.mock.calls[0][0]).not.toContain('# Reminder for this turn');
  });

  it('adds the crisis reminder when the user may be in crisis', async () => {
    await handler(createRequest({ message: '요즘 그냥 죽고 싶어' }), createResponse());

    expect(generateReplyMock.mock.calls[0][0]).toContain('# Safety reminder for this turn');
  });

  it('tells the character about earlier songs when a conversation starts', async () => {
    (loadSongMemory as jest.Mock).mockResolvedValueOnce('# Memory: songs this user already wrote with you\n- "이별 노래"');
    await handler(createRequest({ message: '오랜만이야' }), createResponse());

    expect(loadSongMemory).toHaveBeenCalledWith('user-1', null, null);
    expect(generateReplyMock.mock.calls[0][0]).toContain('- "이별 노래"');
  });
});
