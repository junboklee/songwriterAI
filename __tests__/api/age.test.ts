import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '@/pages/api/profile/age';
import { adminAuth } from '@/lib/firebaseAdmin';
import { requireUser } from '@/lib/serverAuth';

jest.mock('@/lib/serverAuth', () => ({ ADULT_CLAIM: 'adultConfirmedAt', requireUser: jest.fn() }));
jest.mock('@/lib/rateLimiter', () => ({ enforceRateLimit: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logInfo: jest.fn(), logError: jest.fn() }));
jest.mock('@/lib/firebaseAdmin', () => ({
  adminAuth: {
    getUser: jest.fn().mockResolvedValue({ customClaims: { admin: true } }),
    setCustomUserClaims: jest.fn()
  }
}));

const call = async (body: unknown) => {
  const res: Partial<NextApiResponse & { body?: Record<string, unknown>; code?: number }> = {};
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

describe('POST /api/profile/age', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({ uid: 'u1', ageGate: 'required' });
  });

  it('lets unconfirmed members reach it and records only the confirmation time', async () => {
    const res = await call({ birthDate: '19900115' });
    expect(res.code).toBe(200);
    expect(requireUser).toHaveBeenCalledWith(expect.anything(), { allowUnconfirmedAge: true });
    const [uid, claims] = (adminAuth.setCustomUserClaims as jest.Mock).mock.calls[0];
    expect(uid).toBe('u1');
    // Existing claims are kept; the birth date itself is not stored anywhere.
    expect(claims).toEqual({ admin: true, adultConfirmedAt: expect.any(Number) });
    expect(JSON.stringify(claims)).not.toContain('1990');
  });

  it('refuses members under 19 without recording anything', async () => {
    const res = await call({ birthDate: `${new Date().getFullYear() - 15}0101` });
    expect(res.code).toBe(403);
    expect(res.body?.code).toBe('UNDER_AGE');
    expect(adminAuth.setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('rejects malformed dates', async () => {
    expect((await call({ birthDate: '1990-02-30' })).code).toBe(400);
    expect((await call({})).code).toBe(400);
  });

  it('does not rewrite the claim for members already confirmed', async () => {
    (requireUser as jest.Mock).mockResolvedValue({ uid: 'u1', ageGate: 'confirmed' });
    expect((await call({ birthDate: '19900115' })).code).toBe(200);
    expect(adminAuth.setCustomUserClaims).not.toHaveBeenCalled();
  });
});
