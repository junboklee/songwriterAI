import type { NextApiRequest } from 'next';

import { adminAuth } from '@/lib/firebaseAdmin';
import { requireUser } from '@/lib/serverAuth';

jest.mock('@/lib/logger', () => ({ logWarn: jest.fn() }));
jest.mock('@/lib/firebaseAdmin', () => ({
  adminAuth: { verifyIdToken: jest.fn(), getUser: jest.fn() }
}));

const req = { headers: { authorization: 'Bearer token' }, cookies: {} } as unknown as NextApiRequest;
const account = (claims: Record<string, unknown>, creationTime: string) => ({ customClaims: claims, metadata: { creationTime } });

describe('requireUser age gate', () => {
  beforeEach(() => {
    (adminAuth.verifyIdToken as jest.Mock).mockResolvedValue({ uid: 'u1' });
  });

  it('lets confirmed adults through', async () => {
    (adminAuth.getUser as jest.Mock).mockResolvedValue(account({ adultConfirmedAt: 1 }, new Date().toUTCString()));
    await expect(requireUser(req)).resolves.toMatchObject({ uid: 'u1', ageGate: 'confirmed' });
  });

  it('refuses new accounts that have not confirmed their age, unless the endpoint allows it', async () => {
    (adminAuth.getUser as jest.Mock).mockResolvedValue(account({}, new Date().toUTCString()));
    await expect(requireUser(req)).rejects.toMatchObject({ statusCode: 403, code: 'AGE_CONFIRMATION_REQUIRED' });
    await expect(requireUser(req, { allowUnconfirmedAge: true })).resolves.toMatchObject({ ageGate: 'required' });
  });

  it('does not lock members out when the account record cannot be read', async () => {
    (adminAuth.getUser as jest.Mock).mockRejectedValue(new Error('unavailable'));
    await expect(requireUser(req)).resolves.toMatchObject({ uid: 'u1', ageGate: null });
  });
});
