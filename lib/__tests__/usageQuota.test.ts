import { assertWithinMonthlyQuota } from '@/lib/usage';

const state = { plan: 'free', requests: 0 };

jest.mock('@/lib/firebaseAdmin', () => {
  const doc = (kind: 'user' | 'usage') => ({
    get: async () =>
      kind === 'user'
        ? { get: (field: string) => (field === 'plan' ? state.plan : undefined) }
        : { exists: true, data: () => ({ chatRequests: state.requests }) },
    collection: () => ({ doc: () => doc('usage') })
  });
  return { adminDb: { collection: () => ({ doc: () => doc('user') }) } };
});

describe('assertWithinMonthlyQuota', () => {
  const original = process.env.CHAT_MONTHLY_LIMIT_FREE;
  afterAll(() => {
    process.env.CHAT_MONTHLY_LIMIT_FREE = original;
  });

  it('returns usage including the request about to be made', async () => {
    process.env.CHAT_MONTHLY_LIMIT_FREE = '300';
    state.requests = 41;
    await expect(assertWithinMonthlyQuota('u1')).resolves.toEqual({ used: 42, limit: 300 });
  });

  it('blocks once the cap is reached', async () => {
    process.env.CHAT_MONTHLY_LIMIT_FREE = '300';
    state.requests = 300;
    await expect(assertWithinMonthlyQuota('u1')).rejects.toMatchObject({ statusCode: 429, code: 'MONTHLY_QUOTA_EXCEEDED' });
  });

  it('reports no limit when the cap is unset', async () => {
    delete process.env.CHAT_MONTHLY_LIMIT_FREE;
    state.requests = 5000;
    await expect(assertWithinMonthlyQuota('u1')).resolves.toEqual({ used: 5001, limit: null });
  });
});
