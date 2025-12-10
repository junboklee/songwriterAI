const store = new Map<string, Record<string, unknown>>();
const mockCollection = jest.fn((name: string) => ({
  doc: (id: string) => ({ path: `${name}/${id}` }),
  where: () => ({
    limit: () => ({
      get: jest.fn().mockResolvedValue({ empty: true, size: 0, docs: [] })
    })
  })
}));
const mockRunTransaction = jest.fn(async callback => {
  const tx = {
    async get(docRef: { path: string }) {
      const data = store.get(docRef.path);
      return data
        ? { exists: true, data: () => data }
        : { exists: false, data: () => ({}) };
    },
    set(docRef: { path: string }, payload: Record<string, unknown>) {
      const previous = store.get(docRef.path) || {};
      store.set(docRef.path, { ...previous, ...payload });
    }
  };

  return callback(tx);
});
const mockBatch = jest.fn(() => ({
  delete: jest.fn(),
  commit: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('@/lib/firebaseAdmin', () => ({
  adminDb: {
    collection: mockCollection,
    runTransaction: mockRunTransaction,
    batch: mockBatch
  },
  adminAuth: {},
  adminStorage: {}
}));

describe('enforceRateLimit', () => {
const loadLimiter = () => {
  jest.resetModules();
  store.clear();
  process.env.CHAT_RATE_LIMIT_MAX_REQUESTS = '2';
  process.env.CHAT_RATE_LIMIT_WINDOW_MS = '60000';
  jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000);

  let limiter: (key: string) => Promise<void>;
  jest.isolateModules(() => {
    // eslint-disable-next-line global-require
    limiter = require('@/lib/rateLimiter').enforceRateLimit;
  });

  return limiter!;
};

afterEach(() => {
  jest.restoreAllMocks();
});

  it('allows requests within the configured window and stores sanitized keys', async () => {
    const enforceRateLimit = loadLimiter();
    const key = 'user@example.com';

    await enforceRateLimit(key);
    await enforceRateLimit(key);

    expect(store.has('_rateLimitWindows/user_example_com')).toBe(true);
  });

  it('throws when the window is exceeded', async () => {
    const enforceRateLimit = loadLimiter();
    await enforceRateLimit('burst-key');
    await enforceRateLimit('burst-key');

    await expect(enforceRateLimit('burst-key')).rejects.toThrow('rateLimiter.exceeded');
  });
});
