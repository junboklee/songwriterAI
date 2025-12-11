import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '@/pages/api/profile/characters';
import { requireUser, UnauthorizedError } from '@/lib/serverAuth';

jest.mock('@/lib/serverAuth', () => ({
  requireUser: jest.fn(),
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

const mockQuery = {
  orderBy: jest.fn(() => mockQuery),
  limit: jest.fn(() => mockQuery),
  startAfter: jest.fn(() => mockQuery),
  get: jest.fn(async () => ({
    docs: [
      {
        id: 'char-1',
        data: () => ({
          name: 'Muse',
          avatarUrl: '',
          updatedAt: { toMillis: () => Date.now() }
        })
      }
    ]
  }))
};

jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        collection: jest.fn(() => mockQuery)
      }))
    }))
  }
}));

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

const createRequest = (overrides?: Partial<NextApiRequest>): NextApiRequest =>
  ({
    method: 'GET',
    headers: {},
    query: {},
    ...overrides
  } as unknown as NextApiRequest);

const createResponse = () => {
  const res: Partial<NextApiResponse & { statusCode?: number; body?: unknown }> = {};
  res.status = jest.fn(code => {
    res.statusCode = code;
    return res as NextApiResponse;
  });
  res.json = jest.fn(payload => {
    res.body = payload;
    return res as NextApiResponse;
  });
  res.setHeader = jest.fn();
  return res as NextApiResponse & { statusCode?: number; body?: unknown };
};

describe('/api/profile/characters index handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({ uid: 'user-1' });
  });

  it('enforces GET-only access', async () => {
    const req = createRequest({ method: 'POST' });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.body).toEqual({ error: 'Method not allowed' });
  });

  it('returns 401 when requireUser throws UnauthorizedError', async () => {
    const error = new UnauthorizedError('missing token');
    mockRequireUser.mockRejectedValueOnce(error);

    const req = createRequest();
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toEqual({ error: 'missing token' });
  });
});
