import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '@/pages/api/chat';
import { authenticateRequest } from '@/lib/serverAuth';
import { saveThreadSnapshot } from '@/lib/chatPersistence';
import { enforceRateLimit } from '@/lib/rateLimiter';

const mockAuthenticateRequest = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>;
const mockSaveThreadSnapshot = saveThreadSnapshot as jest.MockedFunction<typeof saveThreadSnapshot>;
const mockEnforceRateLimit = enforceRateLimit as jest.MockedFunction<typeof enforceRateLimit>;

type OpenAiMockState = {
  threadCreateMock: jest.Mock;
  runCreateMock: jest.Mock;
  runRetrieveMock: jest.Mock;
  messageCreateMock: jest.Mock;
  messageListMock: jest.Mock;
};

function ensureOpenAiMockState(): Partial<OpenAiMockState> {
  const globalRef = globalThis as Record<string, unknown>;
  if (!globalRef.__openAiMockState) {
    globalRef.__openAiMockState = {};
  }
  return globalRef.__openAiMockState as Partial<OpenAiMockState>;
}

jest.mock('openai', () => {
  const state: OpenAiMockState = {
    threadCreateMock: jest.fn(),
    runCreateMock: jest.fn(),
    runRetrieveMock: jest.fn(),
    messageCreateMock: jest.fn(),
    messageListMock: jest.fn()
  };

  Object.assign(ensureOpenAiMockState(), state);

  return jest.fn().mockImplementation(() => ({
    beta: {
      threads: {
        create: state.threadCreateMock,
        messages: {
          create: state.messageCreateMock,
          list: state.messageListMock
        },
        runs: {
          create: state.runCreateMock,
          retrieve: state.runRetrieveMock
        }
      }
    }
  }));
});

const openAiMockState = ensureOpenAiMockState();

jest.mock('@/lib/serverAuth', () => ({
  authenticateRequest: jest.fn()
}));

jest.mock('@/lib/chatPersistence', () => ({
  saveThreadSnapshot: jest.fn()
}));

jest.mock('@/lib/rateLimiter', () => ({
  enforceRateLimit: jest.fn()
}));

jest.mock('@/lib/logger', () => ({
  logInfo: jest.fn(),
  logError: jest.fn()
}));

jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: () => ({
        collection: () => ({
          doc: () => ({
            get: jest.fn().mockResolvedValue({ exists: false })
          })
        })
      })
    }))
  },
  adminAuth: {},
  adminStorage: {}
}));

const createRequest = (overrides?: Partial<NextApiRequest>): NextApiRequest =>
  ({
    method: 'POST',
    headers: {},
    body: {},
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides
  } as unknown as NextApiRequest);

type MockResponse = NextApiResponse & {
  statusCode?: number;
  body?: unknown;
};

const createResponse = (): MockResponse => {
  const res: Partial<MockResponse> = {};
  res.status = jest.fn(code => {
    res.statusCode = code;
    return res as NextApiResponse;
  });
  res.json = jest.fn(payload => {
    res.body = payload;
    return res as NextApiResponse;
  });
  res.setHeader = jest.fn();
  res.end = jest.fn();
  return res as MockResponse;
};

describe('/api/chat handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthenticateRequest.mockResolvedValue({
      user: { uid: 'user-1', email: 'test@example.com' }
    });
    mockEnforceRateLimit.mockResolvedValue(undefined);
    openAiMockState.threadCreateMock?.mockResolvedValue({ id: 'thread-1' });
    openAiMockState.runCreateMock?.mockResolvedValue({ id: 'run-1' });
    openAiMockState.runRetrieveMock?.mockResolvedValue({ status: 'completed' });
    openAiMockState.messageCreateMock?.mockResolvedValue(undefined);
    openAiMockState.messageListMock?.mockResolvedValue({
      data: [
        {
          id: 'assistant-1',
          role: 'assistant',
          created_at: 1_700_000_000,
          content: [
            {
              type: 'text',
              text: { value: '안녕하세요' }
            }
          ]
        }
      ]
    });
    mockSaveThreadSnapshot.mockResolvedValue(undefined);
  });

  it('rejects non-POST methods', async () => {
    const req = createRequest({ method: 'GET' });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.body).toEqual({ error: 'Method not allowed' });
  });

  it('returns 400 when message is missing', async () => {
    const req = createRequest({ body: { message: '   ' } });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ error: 'Message is required.', code: 'BAD_REQUEST' });
    expect(mockSaveThreadSnapshot).not.toHaveBeenCalled();
  });

  it('processes chat requests and saves thread snapshots', async () => {
    const req = createRequest({
      body: {
        message: '첫 줄',
        characterId: '1'
      }
    });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockSaveThreadSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        user: expect.objectContaining({ uid: 'user-1' }),
        threadId: 'thread-1',
        characterId: '1'
      })
    );
    expect(openAiMockState.messageCreateMock).toHaveBeenCalledWith('thread-1', {
      role: 'user',
      content: '첫 줄'
    });
  });
});
