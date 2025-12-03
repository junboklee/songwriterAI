import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '@/pages/api/profile';
import { requireUser } from '@/lib/serverAuth';
import { adminDb } from '@/lib/firebaseAdmin';

jest.mock('@/lib/serverAuth', () => ({
  requireUser: jest.fn()
}));

jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: jest.fn()
  },
  adminAuth: {} as unknown,
  adminStorage: {} as unknown
}));

const getCollectionMock = () => adminDb.collection as jest.Mock;

type MockResponse = NextApiResponse & {
  statusCode?: number;
  body?: unknown;
};

const createMockRes = (): MockResponse => {
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

const createRequest = (overrides: Partial<NextApiRequest>): NextApiRequest =>
  ({
    method: 'GET',
    headers: {},
    query: {},
    cookies: {},
    body: undefined,
    ...overrides
  } as unknown as NextApiRequest);

const mockRequireUser = requireUser as jest.MockedFunction<typeof requireUser>;

const mockUserRef = () => {
  const userSnapshot = {
    exists: true,
    data: () => ({
      displayName: 'Nova',
      email: 'nova@example.com',
      photoURL: null,
      recentCharacterIds: ['1'],
      lastCharacterId: '1',
      preferences: { locale: 'ko' },
      createdAt: { toDate: () => new Date('2025-01-01T00:00:00Z') },
      updatedAt: { toDate: () => new Date('2025-06-01T00:00:00Z') },
      lastLoginAt: { toDate: () => new Date('2025-07-01T00:00:00Z') }
    })
  };

  const createCountQuery = (count: number) => ({
    get: jest.fn().mockResolvedValue({
      data: () => ({ count })
    })
  });

  const ref = {
    get: jest.fn().mockResolvedValue(userSnapshot),
    set: jest.fn().mockResolvedValue(undefined),
    collection: jest.fn((name: string) => {
      if (name === 'conversations') {
        return {
          count: () => createCountQuery(4)
        };
      }

      if (name === 'songs') {
        return {
          count: () => createCountQuery(2)
        };
      }

      return {
        count: () => createCountQuery(0)
      };
    })
  };

  return { ref, userSnapshot };
};

describe('/api/profile handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getCollectionMock().mockReset();
  });

  it('returns profile summary for GET requests', async () => {
    const { ref } = mockUserRef();
    const docMock = jest.fn().mockReturnValue(ref);
    getCollectionMock().mockReturnValue({
      doc: docMock
    });

    mockRequireUser.mockResolvedValue({
      uid: 'user-1',
      email: 'nova@example.com',
      name: 'Nova'
    });

    const req = createRequest({ method: 'GET' });
    const res = createMockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({
      profile: expect.objectContaining({
        uid: 'user-1',
        email: 'nova@example.com',
        displayName: 'Nova',
        recentCharacterIds: ['1'],
        lastCharacterId: '1',
        preferences: { locale: 'ko' }
      }),
      stats: {
        conversationCount: 4,
        songCount: 2
      }
    });
    expect(ref.collection).toHaveBeenCalledWith('conversations');
    expect(ref.collection).toHaveBeenCalledWith('songs');
  });

  it('updates displayName and preferences via PATCH', async () => {
    const updatedSnapshot = {
      exists: true,
      data: () => ({
        displayName: 'Dayeon',
        preferences: { locale: 'ko' },
        recentCharacterIds: [],
        createdAt: null,
        updatedAt: null,
        lastLoginAt: null,
        lastCharacterId: null,
        email: 'nova@example.com',
        photoURL: null
      })
    };

    const ref = {
      get: jest.fn().mockResolvedValue(updatedSnapshot),
      set: jest.fn().mockResolvedValue(undefined),
      collection: jest.fn()
    };

    const docMock = jest.fn().mockReturnValue(ref);
    getCollectionMock().mockReturnValue({
      doc: docMock
    });

    mockRequireUser.mockResolvedValue({
      uid: 'user-1',
      email: 'nova@example.com'
    });

    const req = createRequest({
      method: 'PATCH',
      body: {
        displayName: 'Dayeon',
        preferences: { locale: 'ko' }
      }
    });

    const res = createMockRes();

    await handler(req, res);

    expect(ref.set).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({
      profile: expect.objectContaining({
        displayName: 'Dayeon',
        preferences: { locale: 'ko' }
      })
    });
  });
});
