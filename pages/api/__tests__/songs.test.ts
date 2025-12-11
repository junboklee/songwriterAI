import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '@/pages/api/profile/songs';
import { requireUser } from '@/lib/serverAuth';

jest.mock('@/lib/serverAuth', () => ({
  requireUser: jest.fn(),
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

const mockSongsCollection: Record<string, jest.Mock> & {
  orderBy: jest.Mock;
  limit: jest.Mock;
  startAfter: jest.Mock;
  get: jest.Mock;
  doc: jest.Mock;
} = {} as never;

mockSongsCollection.orderBy = jest.fn(() => mockSongsCollection);
mockSongsCollection.limit = jest.fn(() => mockSongsCollection);
mockSongsCollection.startAfter = jest.fn(() => mockSongsCollection);
mockSongsCollection.get = jest.fn(async () => ({ docs: [] }));
mockSongsCollection.doc = jest.fn(() => ({
  set: jest.fn(),
  get: jest.fn(async () => ({ data: () => ({}) }))
}));

const mockUserDoc = {
  collection: jest.fn(() => mockSongsCollection)
};

jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => mockUserDoc)
    }))
  },
  adminAuth: {},
  adminStorage: {}
}));

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

const createRequest = (overrides?: Partial<NextApiRequest>): NextApiRequest =>
  ({
    method: 'GET',
    headers: {},
    query: {},
    body: undefined,
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

describe('/api/profile/songs handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({
      uid: 'user-1'
    });
  });

  it('rejects POST requests without lyrics', async () => {
    const req = createRequest({
      method: 'POST',
      body: {
        title: 'Draft',
        lyrics: '   '
      }
    });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({ error: 'lyrics is required.' });
  });

  it('requires ids array when deleteAll is not true', async () => {
    const req = createRequest({
      method: 'DELETE',
      body: {
        ids: []
      }
    });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body).toEqual({
      error: 'ids array is required to delete selected songs.'
    });
  });
});
