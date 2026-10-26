import { adminAuth } from '@/lib/firebaseAdmin';
import { confirmIdentity, identityKeyOf, identityVerificationIdPattern, newIdentityVerificationId } from '@/lib/identity';

const keyDocs: Record<string, Record<string, unknown>> = {};
jest.mock('@/lib/logger', () => ({ logInfo: jest.fn(), logWarn: jest.fn() }));
jest.mock('firebase-admin/firestore', () => ({ FieldValue: { serverTimestamp: () => 'now' } }));
jest.mock('@/lib/firebaseAdmin', () => ({
  adminAuth: { getUser: jest.fn().mockResolvedValue({ customClaims: { adultConfirmedAt: 1 } }), setCustomUserClaims: jest.fn() },
  adminDb: {
    collection: () => ({ doc: (id: string) => ({ id }) }),
    runTransaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        get: async ({ id }: { id: string }) => ({ exists: Boolean(keyDocs[id]) }),
        set: ({ id }: { id: string }, data: Record<string, unknown>) => {
          keyDocs[id] = { ...keyDocs[id], ...data };
        }
      })
  }
}));

const UID = 'abcUID123';
const ID = `iv-${UID}-kx1y2z3`;
const portone = (body: unknown, ok = true) =>
  (global.fetch = jest.fn().mockResolvedValue({ ok, status: ok ? 200 : 404, json: async () => body }) as unknown as typeof fetch);

describe('confirmIdentity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.PORTONE_API_SECRET = 'secret';
    Object.keys(keyDocs).forEach(key => delete keyDocs[key]);
  });
  afterAll(() => {
    delete process.env.PORTONE_API_SECRET;
  });

  it('is unavailable until PortOne is configured', async () => {
    delete process.env.PORTONE_API_SECRET;
    await expect(confirmIdentity(UID, ID)).rejects.toMatchObject({ statusCode: 503 });
  });

  it('only accepts verifications started by the same account', async () => {
    await expect(confirmIdentity(UID, 'iv-someoneElse-kx1y2z3')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('records a verified adult by a keyed hash only', async () => {
    portone({ status: 'VERIFIED', verifiedCustomer: { name: '홍길동', birthDate: '1990-01-15', ci: 'CI-VALUE', phoneNumber: '01012345678' } });
    await expect(confirmIdentity(UID, ID)).resolves.toEqual({ verified: true });

    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain(`/identity-verifications/${ID}`);
    expect(init.headers.Authorization).toBe('PortOne secret');

    const key = identityKeyOf('ci:CI-VALUE');
    const [, claims] = (adminAuth.setCustomUserClaims as jest.Mock).mock.calls[0];
    expect(claims).toEqual({ adultConfirmedAt: 1, identityVerifiedAt: expect.any(Number), identityKey: key });
    expect(keyDocs[key]).toMatchObject({ firstUid: UID, freeClipsUsed: 0 });
    const stored = JSON.stringify({ claims, keyDocs });
    ['홍길동', '1990', 'CI-VALUE', '01012345678'].forEach(secret => expect(stored).not.toContain(secret));
  });

  it('refuses people under 19 and unfinished verifications', async () => {
    portone({ status: 'VERIFIED', verifiedCustomer: { name: 'x', birthDate: `${new Date().getFullYear() - 17}-01-01`, ci: 'c' } });
    await expect(confirmIdentity(UID, ID)).rejects.toMatchObject({ code: 'UNDER_AGE' });
    portone({ status: 'READY' });
    await expect(confirmIdentity(UID, ID)).rejects.toMatchObject({ code: 'IDENTITY_NOT_VERIFIED' });
    expect(adminAuth.setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('keeps the first account linked to a person', async () => {
    portone({ status: 'VERIFIED', verifiedCustomer: { name: 'x', birthDate: '1990-01-15', ci: 'C2' } });
    await confirmIdentity(UID, ID);
    await confirmIdentity('otherUid', 'iv-otherUid-kx1y2z3');
    expect(keyDocs[identityKeyOf('ci:C2')]).toMatchObject({ firstUid: UID, lastUid: 'otherUid' });
  });
});

describe('identity verification ids', () => {
  it('are issued per account and only match that account', () => {
    const id = newIdentityVerificationId(UID);
    expect(identityVerificationIdPattern(UID).test(id)).toBe(true);
    expect(identityVerificationIdPattern('other').test(id)).toBe(false);
    // Special characters in an id are matched literally.
    expect(identityVerificationIdPattern('a.c').test('iv-abc-kx1y2z3')).toBe(false);
    expect(identityVerificationIdPattern('a.c').test('iv-a.c-kx1y2z3')).toBe(true);
  });
});
