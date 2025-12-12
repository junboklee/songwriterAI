import type { NextApiRequest, NextApiResponse } from 'next';

import OpenAI from 'openai';

import { authenticateRequest } from '@/lib/serverAuth';
import { enforceRateLimit } from '@/lib/rateLimiter';
import { saveThreadSnapshot } from '@/lib/chatPersistence';

jest.mock('openai');
jest.mock('@/lib/serverAuth');
jest.mock('@/lib/rateLimiter');
jest.mock('@/lib/chatPersistence');
jest.mock('@/lib/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn()
}));
jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: jest.fn().mockReturnValue({
      doc: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue({
          doc: jest.fn()
        })
      })
    })
  }
}));
jest.mock('@/lib/characterAssistants', () => ({
  createCharacterAssistant: jest.fn()
}));

type MockResponse = NextApiResponse & {
  status: jest.Mock;
  json: jest.Mock;
  setHeader: jest.Mock;
  end: jest.Mock;
};

type OpenAIMocks = {
  threadCreateMock: jest.Mock;
  messageCreateMock: jest.Mock;
  messageListMock: jest.Mock;
  runCreateMock: jest.Mock;
  runRetrieveMock: jest.Mock;
};

const { __mocks: openaiMocks } = OpenAI as unknown as { __mocks: OpenAIMocks };

const authenticateRequestMock = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;
const enforceRateLimitMock = enforceRateLimit as jest.MockedFunction<typeof enforceRateLimit>;
const saveThreadSnapshotMock = saveThreadSnapshot as jest.MockedFunction<typeof saveThreadSnapshot>;

const createRequest = (body: Record<string, unknown>): NextApiRequest =>
  ({
    method: 'POST',
    headers: {},
    body,
    cookies: {},
    query: {},
    socket: {
      remoteAddress: '127.0.0.1'
    }
  } as unknown as NextApiRequest);

const createResponse = (): MockResponse => {
  const res: Partial<MockResponse> = {};
  res.status = jest.fn().mockImplementation(() => res as MockResponse);
  res.json = jest.fn().mockImplementation(() => res as MockResponse);
  res.setHeader = jest.fn();
  res.end = jest.fn();
  return res as MockResponse;
};

const buildTextMessage = (payload: { id: string; role: 'user' | 'assistant'; text: string; createdAt: number }) => ({
  id: payload.id,
  role: payload.role,
  created_at: payload.createdAt,
  content: [
    {
      type: 'text',
      text: {
        value: payload.text
      }
    }
  ]
});

describe('/api/chat handler', () => {
  let handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>;

  beforeAll(async () => {
    process.env.OPENAI_ASSISTANT_ID = 'asst_test_default';
    process.env.OPENAI_API_KEY = 'test-api-key';
    ({ default: handler } = await import('@/pages/api/chat'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authenticateRequestMock.mockResolvedValue({
      user: {
        uid: 'user-1',
        email: 'test@example.com'
      },
      idToken: 'token'
    });
    enforceRateLimitMock.mockResolvedValue(undefined);
    saveThreadSnapshotMock.mockResolvedValue(undefined);
    openaiMocks.threadCreateMock.mockResolvedValue({ id: 'thread-new' });
    openaiMocks.messageCreateMock.mockResolvedValue(undefined);
    openaiMocks.runCreateMock.mockResolvedValue({ id: 'run-1' });
    openaiMocks.runRetrieveMock.mockResolvedValue({ status: 'completed' });
  });

  it('returns 400 when message is missing', async () => {
    const req = createRequest({});
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Message is required.',
        code: 'BAD_REQUEST'
      })
    );
    expect(saveThreadSnapshotMock).not.toHaveBeenCalled();
  });

  it('persists assistant output and returns reply payload', async () => {
    const now = Math.floor(Date.now() / 1000);
    openaiMocks.messageListMock.mockResolvedValue({
      data: [
        buildTextMessage({
          id: 'assistant-message',
          role: 'assistant',
          text: 'Here is your lyric idea.',
          createdAt: now + 1
        }),
        buildTextMessage({
          id: 'user-message',
          role: 'user',
          text: 'Write something upbeat.',
          createdAt: now
        })
      ]
    });

    const req = createRequest({
      message: 'Write something upbeat.'
    });
    const res = createResponse();

    await handler(req, res);

    expect(openaiMocks.threadCreateMock).toHaveBeenCalledTimes(1);
    expect(openaiMocks.messageCreateMock).toHaveBeenCalledWith('thread-new', {
      role: 'user',
      content: 'Write something upbeat.'
    });
    expect(openaiMocks.runCreateMock).toHaveBeenCalledWith('thread-new', {
      assistant_id: 'asst_test_default'
    });
    expect(openaiMocks.messageListMock).toHaveBeenCalledWith('thread-new', {
      limit: 10
    });

    expect(saveThreadSnapshotMock).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: 'thread-new',
        user: expect.objectContaining({ uid: 'user-1' }),
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: 'Write something upbeat.'
          }),
          expect.objectContaining({
            role: 'assistant',
            content: 'Here is your lyric idea.'
          })
        ])
      })
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        threadId: 'thread-new',
        reply: expect.objectContaining({
          role: 'assistant',
          content: 'Here is your lyric idea.'
        })
      })
    );
  });
});
