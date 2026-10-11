import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '@/pages/api/characters';
import { requireUser } from '@/lib/serverAuth';
import { uploadAvatar } from '@/lib/avatarStorage';
import { assertPublishable } from '@/lib/moderation';
import { BadRequestError } from '@/lib/errors';

const mockFields: Record<string, string[]> = {};
const mockFiles: Record<string, unknown[]> = {};

jest.mock('formidable', () => ({
  __esModule: true,
  default: () => ({
    parse: (_req: unknown, callback: (err: null, fields: unknown, files: unknown) => void) =>
      callback(null, mockFields, mockFiles)
  })
}));
jest.mock('@/lib/serverAuth', () => ({
  requireUser: jest.fn(),
  UnauthorizedError: class UnauthorizedError extends Error {}
}));
jest.mock('@/lib/avatarStorage', () => ({ uploadAvatar: jest.fn() }));
jest.mock('@/lib/moderation', () => ({ assertPublishable: jest.fn() }));
jest.mock('@/lib/firebaseAdmin', () => {
  const doc = () => ({ id: 'char-1', set: jest.fn(), collection: () => ({ doc }) });
  return { adminDb: { collection: () => ({ doc }) } };
});

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

const avatar = { filepath: '/tmp/a.png', mimetype: 'image/png', size: 1000, originalFilename: 'a.png' };

describe('POST /api/characters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({ uid: 'user-1' });
    (uploadAvatar as jest.Mock).mockResolvedValue('https://example.com/avatar.png');
    Object.assign(mockFields, { name: ['Muse'], visibility: ['public'] });
    Object.assign(mockFiles, { avatar: [avatar] });
  });

  it('does not upload the avatar when moderation rejects a public character', async () => {
    (assertPublishable as jest.Mock).mockRejectedValueOnce(new BadRequestError('blocked'));
    const res = createResponse();

    await handler({ method: 'POST', headers: {} } as unknown as NextApiRequest, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it('uploads the avatar once moderation passes', async () => {
    const res = createResponse();

    await handler({ method: 'POST', headers: {} } as unknown as NextApiRequest, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(uploadAvatar).toHaveBeenCalledWith('user-1', avatar);
  });
});
