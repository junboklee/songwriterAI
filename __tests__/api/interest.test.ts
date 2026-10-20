import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '@/pages/api/interest';
import { requireUser } from '@/lib/serverAuth';

const store: Record<string, Record<string, unknown>> = {};

jest.mock('@/lib/serverAuth', () => ({
  requireUser: jest.fn(),
  UnauthorizedError: class UnauthorizedError extends Error {}
}));
jest.mock('@/lib/rateLimiter', () => ({ enforceRateLimit: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logInfo: jest.fn() }));
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => 'now', increment: (n: number) => ({ increment: n }) }
}));
jest.mock('@/lib/firebaseAdmin', () => {
  const ref = (path: string) => ({ path });
  return {
    adminDb: {
      collection: (name: string) => ({ doc: (id: string) => ref(`${name}/${id}`) }),
      runTransaction: async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          get: async ({ path }: { path: string }) => ({ exists: Boolean(store[path]) }),
          set: ({ path }: { path: string }, data: Record<string, unknown>) => {
            if (path.startsWith('featureInterestCounts/')) {
              const current = (store[path]?.count as number | undefined) ?? 0;
              store[path] = { count: current + 1 };
            } else {
              store[path] = data;
            }
          }
        })
    }
  };
});

const call = async (body: unknown) => {
  const res: Partial<NextApiResponse & { body?: unknown; code?: number }> = {};
  res.status = jest.fn(code => {
    res.code = code;
    return res as NextApiResponse;
  });
  res.json = jest.fn(payload => {
    res.body = payload;
    return res as NextApiResponse;
  });
  res.setHeader = jest.fn();
  await handler({ method: 'POST', headers: {}, body } as unknown as NextApiRequest, res as NextApiResponse);
  return res;
};

describe('POST /api/interest', () => {
  beforeEach(() => {
    Object.keys(store).forEach(key => delete store[key]);
    (requireUser as jest.Mock).mockResolvedValue({ uid: 'u1' });
  });

  it('counts each user once per feature', async () => {
    expect((await call({ feature: 'sing' })).body).toEqual({ ok: true, isNew: true });
    expect((await call({ feature: 'sing' })).body).toEqual({ ok: true, isNew: false });
    (requireUser as jest.Mock).mockResolvedValue({ uid: 'u2' });
    await call({ feature: 'sing' });

    expect(store['featureInterestCounts/sing']).toEqual({ count: 2 });
    expect(store['featureInterest/sing_u1']).toMatchObject({ feature: 'sing', uid: 'u1' });
  });

  it('rejects unknown features', async () => {
    expect((await call({ feature: 'free-money' })).code).toBe(400);
  });

  it('requires sign-in', async () => {
    const { UnauthorizedError } = jest.requireMock('@/lib/serverAuth');
    (requireUser as jest.Mock).mockRejectedValue(new UnauthorizedError('login'));
    expect((await call({ feature: 'gift' })).code).toBe(401);
  });
});
