import { isAdmin } from '@/lib/adminAuth';
import { reserveSong, songAccess } from '@/lib/music/access';
import type { AuthenticatedUser } from '@/lib/serverAuth';

const keys: Record<string, { freeClipsUsed?: number }> = {};
jest.mock('@/lib/adminAuth', () => ({ isAdmin: jest.fn().mockReturnValue(false) }));
jest.mock('@/lib/firebaseAdmin', () => {
  const ref = (id: string) => ({
    id,
    get: async () => ({ get: (field: string) => (keys[id] as Record<string, unknown> | undefined)?.[field] })
  });
  return {
    adminDb: {
      collection: () => ({ doc: ref }),
      runTransaction: async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          get: async ({ id }: { id: string }) => ({ get: (field: string) => (keys[id] as Record<string, unknown> | undefined)?.[field] }),
          set: ({ id }: { id: string }, data: { freeClipsUsed: number }) => {
            keys[id] = { ...keys[id], ...data };
          }
        })
    }
  };
});

const member = (identityKey: string | null = null) => ({ uid: 'u1', identityKey }) as AuthenticatedUser;

describe('songAccess', () => {
  afterEach(() => {
    delete process.env.SONG_PUBLIC;
    delete process.env.MUSIC_TESTER_UIDS;
    (isAdmin as jest.Mock).mockReturnValue(false);
    Object.keys(keys).forEach(key => delete keys[key]);
  });

  it('is unlimited for admins and test accounts', async () => {
    (isAdmin as jest.Mock).mockReturnValue(true);
    expect(await songAccess(member())).toBe('unlimited');
    (isAdmin as jest.Mock).mockReturnValue(false);
    process.env.MUSIC_TESTER_UIDS = 'u1';
    expect(await songAccess(member())).toBe('unlimited');
  });

  it('stays closed to members until the public launch', async () => {
    expect(await songAccess(member('k1'))).toBe('closed');
  });

  it('asks for identity verification, then gives one free preview per person', async () => {
    process.env.SONG_PUBLIC = 'true';
    expect(await songAccess(member())).toBe('needsIdentity');
    expect(await songAccess(member('k1'))).toBe('free');
    keys.k1 = { freeClipsUsed: 1 };
    expect(await songAccess(member('k1'))).toBe('freeUsed');
  });
});

describe('reserveSong', () => {
  beforeEach(() => {
    process.env.SONG_PUBLIC = 'true';
    Object.keys(keys).forEach(key => delete keys[key]);
  });
  afterEach(() => {
    delete process.env.SONG_PUBLIC;
  });

  it('uses the free preview and can give it back', async () => {
    const release = await reserveSong(member('k1'), 'clip');
    expect(keys.k1.freeClipsUsed).toBe(1);
    await release();
    expect(keys.k1.freeClipsUsed).toBe(0);
  });

  it('refuses a second free preview for the same person, even from another account', async () => {
    await reserveSong(member('k1'), 'clip');
    await expect(reserveSong({ uid: 'u2', identityKey: 'k1' } as AuthenticatedUser, 'clip')).rejects.toMatchObject({
      code: 'FREE_SONGS_USED'
    });
  });

  it('keeps full songs for paid credits and asks unverified members to verify', async () => {
    await expect(reserveSong(member('k1'), 'full')).rejects.toMatchObject({ code: 'PAID_ONLY' });
    await expect(reserveSong(member(), 'clip')).rejects.toMatchObject({ code: 'IDENTITY_REQUIRED' });
  });
});
