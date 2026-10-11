import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '@/pages/api/profile/songs';
import { requireUser } from '@/lib/serverAuth';
import { appendSongVersion, findAutoSaveTarget } from '@/lib/songVersions';

jest.mock('@/lib/serverAuth', () => ({
  requireUser: jest.fn(),
  UnauthorizedError: class UnauthorizedError extends Error {}
}));

jest.mock('@/lib/songVersions', () => ({
  ...jest.requireActual('@/lib/songVersions'),
  appendSongVersion: jest.fn(),
  findAutoSaveTarget: jest.fn()
}));

const mockAppendSongVersion = appendSongVersion as jest.MockedFunction<typeof appendSongVersion>;
const mockFindAutoSaveTarget = findAutoSaveTarget as jest.MockedFunction<typeof findAutoSaveTarget>;

const mockBatch = { set: jest.fn(), commit: jest.fn(async () => undefined) };

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
  id: 'new-song',
  set: jest.fn(),
  get: jest.fn(async () => ({ data: () => ({ lyrics: 'hello', versionCount: 1 }) })),
  collection: jest.fn(() => ({ doc: jest.fn(() => ({ id: 'v1' })) }))
}));

const mockUserDoc = {
  collection: jest.fn(() => mockSongsCollection)
};

jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => mockUserDoc)
    })),
    batch: jest.fn(() => mockBatch)
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

  it('turns a repeated auto-save from the same conversation into a new version', async () => {
    const existingRef = {
      id: 'song-1',
      get: jest.fn(async () => ({ data: () => ({ title: '새벽 창가', lyrics: 'v2', versionCount: 2 }) }))
    };
    mockFindAutoSaveTarget.mockResolvedValueOnce(existingRef as never);

    const req = createRequest({
      method: 'POST',
      body: {
        title: '새벽 창가',
        lyrics: 'v2',
        threadId: 'thread-1',
        metadata: { source: 'auto-from-chat', style: 'lo-fi' }
      }
    });
    const res = createResponse();

    await handler(req, res);

    expect(mockFindAutoSaveTarget).toHaveBeenCalledWith('user-1', 'thread-1', '새벽 창가');
    expect(mockAppendSongVersion).toHaveBeenCalledWith(existingRef, {
      title: '새벽 창가',
      lyrics: 'v2',
      style: 'lo-fi',
      source: 'auto-from-chat'
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual(
      expect.objectContaining({ revised: true, song: expect.objectContaining({ id: 'song-1', versionCount: 2 }) })
    );
  });

  it('does not look for a revision target on manual saves', async () => {
    const req = createRequest({
      method: 'POST',
      body: { title: 'Manual', lyrics: 'hello', threadId: 'thread-1' }
    });
    const res = createResponse();

    await handler(req, res);

    expect(mockFindAutoSaveTarget).not.toHaveBeenCalled();
    expect(mockBatch.commit).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
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
