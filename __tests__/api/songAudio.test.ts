import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '@/pages/api/profile/songs/[songId]/audio/index';
import { isAdmin } from '@/lib/adminAuth';
import { generateSong } from '@/lib/music/lyria';
import { saveSongAudio } from '@/lib/music/songAudio';
import { requireUser } from '@/lib/serverAuth';

jest.mock('@/lib/serverAuth', () => ({ requireUser: jest.fn() }));
jest.mock('@/lib/adminAuth', () => ({ isAdmin: jest.fn() }));
jest.mock('@/lib/rateLimiter', () => ({ enforceRateLimit: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logInfo: jest.fn(), logError: jest.fn() }));
jest.mock('@/lib/music/lyria', () => ({ MAX_SUNG_LYRICS: 3000, generateSong: jest.fn() }));
jest.mock('@/lib/music/songAudio', () => ({
  MAX_AUDIO_PER_SONG: 20,
  countSongAudio: jest.fn().mockResolvedValue(0),
  listSongAudio: jest.fn().mockResolvedValue([{ id: 'a1', length: 'clip' }]),
  saveSongAudio: jest.fn().mockResolvedValue({ id: 'a2', length: 'full' })
}));

let songData: Record<string, unknown> | null = { lyrics: '[Verse]\n비가 와', metadata: { style: 'ballad' } };
jest.mock('@/lib/firebaseAdmin', () => {
  const songRef = {
    id: 's1',
    get: async () => ({
      exists: songData !== null,
      get: (field: string) => songData?.[field]
    })
  };
  return {
    adminDb: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => songRef }) }) }) }
  };
});

const call = async (method: string, body?: unknown) => {
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
  await handler({ method, headers: {}, query: { songId: 's1' }, body } as unknown as NextApiRequest, res as NextApiResponse);
  return res;
};

describe('/api/profile/songs/[songId]/audio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    songData = { lyrics: '[Verse]\n비가 와', metadata: { style: 'ballad' } };
    (requireUser as jest.Mock).mockResolvedValue({ uid: 'u1' });
  });

  it('lists audio and tells the client whether it may generate', async () => {
    (isAdmin as jest.Mock).mockReturnValue(false);
    const res = await call('GET');
    expect(res.code).toBe(200);
    expect(res.body).toEqual({ canGenerate: false, items: [{ id: 'a1', length: 'clip' }] });
  });

  it('keeps generation admin-only while the feature is tested', async () => {
    (isAdmin as jest.Mock).mockReturnValue(false);
    const res = await call('POST', { length: 'clip' });
    expect(res.code).toBe(403);
    expect(generateSong).not.toHaveBeenCalled();
  });

  it('sings the saved lyrics with the saved style for admins', async () => {
    (isAdmin as jest.Mock).mockReturnValue(true);
    (generateSong as jest.Mock).mockResolvedValue({ model: 'lyria-3-pro-preview', audio: Buffer.from('x') });
    const res = await call('POST', { length: 'full' });
    expect(res.code).toBe(201);
    expect(generateSong).toHaveBeenCalledWith({ length: 'full', style: 'ballad', lyrics: '[Verse]\n비가 와' });
    expect(saveSongAudio).toHaveBeenCalled();
    expect(res.body).toEqual({ item: { id: 'a2', length: 'full' } });
  });

  it('refuses empty lyrics and unknown songs', async () => {
    (isAdmin as jest.Mock).mockReturnValue(true);
    songData = { lyrics: '  ' };
    expect((await call('POST', {})).code).toBe(400);
    songData = null;
    expect((await call('GET')).code).toBe(404);
  });
  it('lets the configured test accounts generate without admin rights', async () => {
    (isAdmin as jest.Mock).mockReturnValue(false);
    process.env.MUSIC_TESTER_UIDS = 'other, u1';
    try {
      const res = await call('GET');
      expect(res.body?.canGenerate).toBe(true);
    } finally {
      delete process.env.MUSIC_TESTER_UIDS;
    }
  });
});
