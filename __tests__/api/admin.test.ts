import type { NextApiRequest, NextApiResponse } from 'next';

import { isAdmin } from '@/lib/adminAuth';
import { requireUser } from '@/lib/serverAuth';
import moderateHandler from '@/pages/api/admin/characters/[id]';

jest.mock('@/lib/serverAuth', () => ({ requireUser: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logInfo: jest.fn() }));

const batch = { update: jest.fn(), delete: jest.fn(), commit: jest.fn(async () => undefined) };
const publicDoc = { exists: true, get: (field: string) => (field === 'creatorId' ? 'owner-1' : undefined) };
const ownerDoc = { exists: true };
const reportDocs = [{ ref: { id: 'r1' } }, { ref: { id: 'r2' } }];

jest.mock('@/lib/firebaseAdmin', () => {
  const ref = (path: string) => ({ path, get: jest.fn(async () => (path.startsWith('users/') ? ownerDoc : publicDoc)) });
  return {
    adminDb: {
      batch: () => batch,
      collection: (name: string) => ({
        doc: (id: string) => ({
          ...ref(`${name}/${id}`),
          collection: (sub: string) => ({ doc: (subId: string) => ref(`${name}/${id}/${sub}/${subId}`) })
        }),
        where: () => ({ where: () => ({ get: async () => ({ docs: reportDocs, size: reportDocs.length }) }) })
      })
    }
  };
});

const requireUserMock = requireUser as jest.MockedFunction<typeof requireUser>;

const createResponse = () => {
  const res: Partial<NextApiResponse & { body?: unknown }> = {};
  res.status = jest.fn(() => res as NextApiResponse);
  res.json = jest.fn(payload => {
    res.body = payload;
    return res as NextApiResponse;
  });
  res.setHeader = jest.fn();
  return res as NextApiResponse & { body?: unknown };
};

const request = (action: string) =>
  ({ method: 'POST', query: { id: 'char-1' }, body: { action }, headers: {} } as unknown as NextApiRequest);

describe('admin access', () => {
  const original = process.env.ADMIN_EMAILS;
  beforeEach(() => {
    process.env.ADMIN_EMAILS = 'Admin@Example.com, other@example.com';
    jest.clearAllMocks();
  });
  afterAll(() => {
    process.env.ADMIN_EMAILS = original;
  });

  it('requires a listed and verified email', () => {
    expect(isAdmin({ uid: 'a', email: 'admin@example.com', emailVerified: true })).toBe(true);
    expect(isAdmin({ uid: 'a', email: 'admin@example.com', emailVerified: false })).toBe(false);
    expect(isAdmin({ uid: 'b', email: 'someone@example.com', emailVerified: true })).toBe(false);
  });

  it('rejects non-admins with 403 before touching data', async () => {
    requireUserMock.mockResolvedValue({ uid: 'b', email: 'someone@example.com', emailVerified: true });
    const res = createResponse();

    await moderateHandler(request('hide'), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(batch.commit).not.toHaveBeenCalled();
  });

  it('hides a character and marks its open reports as actioned', async () => {
    requireUserMock.mockResolvedValue({ uid: 'admin', email: 'admin@example.com', emailVerified: true });
    const res = createResponse();

    await moderateHandler(request('hide'), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(batch.update).toHaveBeenCalledWith(expect.objectContaining({ path: 'characters/char-1' }), expect.objectContaining({ hidden: true }));
    expect(batch.update).toHaveBeenCalledWith(reportDocs[0].ref, expect.objectContaining({ status: 'actioned', resolvedBy: 'admin' }));
  });

  it('unpublish makes the owner copy private and deletes only the public copy', async () => {
    requireUserMock.mockResolvedValue({ uid: 'admin', email: 'admin@example.com', emailVerified: true });
    const res = createResponse();

    await moderateHandler(request('unpublish'), res);

    expect(batch.update).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'users/owner-1/characters/char-1' }),
      expect.objectContaining({ visibility: 'private' })
    );
    expect(batch.delete).toHaveBeenCalledWith(expect.objectContaining({ path: 'characters/char-1' }));
  });

  it('rejects unknown actions', async () => {
    requireUserMock.mockResolvedValue({ uid: 'admin', email: 'admin@example.com', emailVerified: true });
    const res = createResponse();

    await moderateHandler(request('delete-everything'), res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
