import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '@/pages/api/profile/songs/[songId]';
import { appendSongVersion } from '@/lib/songVersions';

jest.mock('@/lib/serverAuth', () => ({
  requireUser: jest.fn().mockResolvedValue({ uid: 'user-1' }),
  UnauthorizedError: class UnauthorizedError extends Error {}
}));
jest.mock('@/lib/songVersions', () => ({
  appendSongVersion: jest.fn(),
  deleteSongDeep: jest.fn(),
  shareSong: jest.fn(),
  unshareSong: jest.fn(),
  MAX_VERSIONS_PER_SONG: 50,
  serializeSong: jest.fn((id: string) => ({ id })),
  serializeVersion: jest.fn((id: string) => ({ id }))
}));
jest.mock('@/lib/firebaseAdmin', () => {
  const versions = { orderBy: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }) };
  const songRef = {
    id: 's1',
    get: async () => ({ exists: true, id: 's1', data: () => ({ lyrics: 'old' }) }),
    collection: () => versions
  };
  return { adminDb: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => songRef }) }) }) } };
});

const respond = () => {
  const res: Partial<NextApiResponse> = {};
  res.status = jest.fn(() => res as NextApiResponse);
  res.json = jest.fn(() => res as NextApiResponse);
  res.setHeader = jest.fn();
  return res as NextApiResponse;
};

describe('PATCH /api/profile/songs/[songId] aiLines', () => {
  it('keeps only AI-rewritten lines that are in the saved lyrics', async () => {
    const req = {
      method: 'PATCH',
      query: { songId: 's1' },
      headers: {},
      body: { lyrics: '[Verse]\n삼월의 바람\n둘째 줄', aiLines: ['삼월의 바람', '지어낸 줄', 42, '  삼월의 바람  '] }
    } as unknown as NextApiRequest;

    await handler(req, respond());

    expect(appendSongVersion).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ source: 'manual', aiAssisted: true, aiLines: ['삼월의 바람'] })
    );
  });
});
