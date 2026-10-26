import type { NextApiRequest, NextApiResponse } from 'next';

import handler from '@/pages/api/profile/songs/[songId]/audio/index';
import { AppError } from '@/lib/errors';
import { reserveSong, songAccess } from '@/lib/music/access';
import { generateSong } from '@/lib/music/lyria';
import { saveSongAudio } from '@/lib/music/songAudio';
import { requireUser } from '@/lib/serverAuth';

jest.mock('@/lib/serverAuth', () => ({ requireUser: jest.fn() }));
jest.mock('@/lib/music/access', () => ({ songAccess: jest.fn(), reserveSong: jest.fn() }));
jest.mock('@/lib/rateLimiter', () => ({ enforceRateLimit: jest.fn() }));
jest.mock('@/lib/logger', () => ({ logInfo: jest.fn(), logError: jest.fn() }));
jest.mock('@/lib/music/lyria', () => ({ MAX_SUNG_LYRICS: 3000, generateSong: jest.fn() }));
jest.mock('@/lib/music/songAudio', () => ({
  MAX_AUDIO_PER_SONG: 20,
  countSongAudio: jest.fn().mockResolvedValue(0),
  listSongAudio: jest.fn().mockResolvedValue([{ id: 'a1', length: 'clip' }]),
  saveSongAudio: jest.fn().mockResolvedValue({ id: 'a2', length: 'full' })
}));

let songData: Record<string, unknown> | null = null;
jest.mock('@/lib/firebaseAdmin', () => {
  const songRef = {
    id: 's1',
    get: async () => ({ exists: songData !== null, get: (field: string) => songData?.[field] })
  };
  return { adminDb: { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => songRef }) }) }) } };
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
  const release = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    songData = { lyrics: '[Verse]\n비가 와', metadata: { style: 'ballad' } };
    (requireUser as jest.Mock).mockResolvedValue({ uid: 'u1' });
    (reserveSong as jest.Mock).mockResolvedValue(release);
  });

  it('lists audio with what this account may do', async () => {
    (songAccess as jest.Mock).mockResolvedValue('needsIdentity');
    const res = await call('GET');
    expect(res.code).toBe(200);
    expect(res.body).toEqual({ access: 'needsIdentity', canGenerate: false, items: [{ id: 'a1', length: 'clip' }] });
  });

  it('refuses generation when access is denied, without calling Lyria', async () => {
    (reserveSong as jest.Mock).mockRejectedValue(new AppError('노래 만들기는 아직 준비 중이에요.', { statusCode: 403, code: 'FORBIDDEN' }));
    const res = await call('POST', { length: 'clip' });
    expect(res.code).toBe(403);
    expect(generateSong).not.toHaveBeenCalled();
  });

  it('sings the saved lyrics with the saved style', async () => {
    (generateSong as jest.Mock).mockResolvedValue({ model: 'lyria-3-pro-preview', audio: Buffer.from('x') });
    const res = await call('POST', { length: 'full' });
    expect(res.code).toBe(201);
    expect(reserveSong).toHaveBeenCalledWith({ uid: 'u1' }, 'full');
    expect(generateSong).toHaveBeenCalledWith({ length: 'full', style: 'ballad', lyrics: '[Verse]\n비가 와' });
    expect(saveSongAudio).toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();
  });

  it('gives the free preview back when generation fails', async () => {
    (generateSong as jest.Mock).mockRejectedValue(new AppError('노래를 만들지 못했어요.', { statusCode: 502, code: 'MUSIC_FAILED' }));
    const res = await call('POST', { length: 'clip' });
    expect(res.code).toBe(502);
    expect(release).toHaveBeenCalled();
  });

  it('refuses empty lyrics and unknown songs', async () => {
    songData = { lyrics: '  ' };
    expect((await call('POST', {})).code).toBe(400);
    expect(reserveSong).not.toHaveBeenCalled();
    songData = null;
    expect((await call('GET')).code).toBe(404);
  });
});
