import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '@/pages/api/admin/metrics';
import { requireAdmin } from '@/lib/adminAuth';
import { AppError } from '@/lib/errors';

jest.mock('@/lib/adminAuth', () => ({ requireAdmin: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logError: jest.fn() }));

const doc = (path: string, data: Record<string, unknown>) => ({
  id: path.split('/').pop(),
  ref: { path },
  get: (field: string) => data[field]
});
jest.mock('@/lib/firebaseAdmin', () => {
  const recent = new Date().toUTCString();
  return {
    adminAuth: {
      listUsers: jest.fn().mockResolvedValue({
        users: [
          { uid: 'a', customClaims: { adultConfirmedAt: 1 }, metadata: { creationTime: recent, lastRefreshTime: recent } },
          { uid: 'smoke', customClaims: {}, metadata: { creationTime: recent, lastSignInTime: recent } }
        ],
        pageToken: undefined
      })
    },
    adminDb: {
      collectionGroup: (name: string) => {
        const docs =
          name === 'usage'
            ? [doc(`users/a/usage/${new Date().toISOString().slice(0, 7)}`, { chatRequests: 5 })]
            : [doc('users/a/songs/s1', { metadata: { source: 'trial' } })];
        const query = { limit: () => query, select: () => query, get: async () => ({ docs }), count: () => ({ get: async () => ({ data: () => ({ count: 2 }) }) }) };
        return query;
      },
      collection: (name: string) =>
        name === 'featureInterestCounts'
          ? { get: async () => ({ docs: [doc('featureInterestCounts/sing', { count: 3 })] }) }
          : { doc: () => ({ get: async () => ({ get: () => 4 }) }) }
    }
  };
});

const call = async () => {
  const res: Partial<NextApiResponse & { body?: Record<string, any>; code?: number }> = {};
  res.status = jest.fn(code => {
    res.code = code;
    return res as NextApiResponse;
  });
  res.json = jest.fn(payload => {
    res.body = payload;
    return res as NextApiResponse;
  });
  res.setHeader = jest.fn();
  await handler({ method: 'GET', headers: {} } as unknown as NextApiRequest, res as NextApiResponse);
  return res;
};

describe('GET /api/admin/metrics', () => {
  it('is for admins only', async () => {
    (requireAdmin as jest.Mock).mockRejectedValue(new AppError('관리자 권한이 없습니다.', { statusCode: 403, code: 'FORBIDDEN' }));
    expect((await call()).code).toBe(403);
  });

  it('returns totals without the test accounts', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({ uid: 'admin' });
    process.env.MUSIC_TESTER_UIDS = 'smoke';
    try {
      const res = await call();
      expect(res.code).toBe(200);
      expect(res.body?.members).toMatchObject({ total: 1, adultConfirmed: 1, new7: 1 });
      expect(res.body?.songs).toEqual({ total: 1, fromChat: 0, fromTrial: 1, other: 0, audio: 2 });
      expect(res.body?.trial).toEqual({ today: 4, yesterday: 4 });
      expect(res.body?.interest).toEqual({ sing: 3 });
      expect(res.body?.usage.requests).toBe(5);
    } finally {
      delete process.env.MUSIC_TESTER_UIDS;
    }
  });
});
