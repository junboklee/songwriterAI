import type { NextApiRequest, NextApiResponse } from 'next';

import { isAdmin } from '@/lib/adminAuth';
import { AppError, BadRequestError } from '@/lib/errors';
import { adminDb } from '@/lib/firebaseAdmin';
import { logError, logInfo } from '@/lib/logger';
import { generateSong, MAX_SUNG_LYRICS, type SongLength } from '@/lib/music/lyria';
import { countSongAudio, listSongAudio, MAX_AUDIO_PER_SONG, saveSongAudio } from '@/lib/music/songAudio';
import { enforceRateLimit } from '@/lib/rateLimiter';
import { requireUser } from '@/lib/serverAuth';

// GET  -> { canGenerate, items }  audio generated for this song (newest first)
// POST { length: 'clip' | 'full' } -> { item }  sings the song's current lyrics with Lyria
// Generation is admin-only while the feature is tested; public launch needs identity verification
// (terms 제4조) and the free/paid allowance decided for it.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const songId = Array.isArray(req.query.songId) ? req.query.songId[0] : req.query.songId;
  if (!songId) {
    return res.status(400).json({ error: 'songId is required.' });
  }

  try {
    const user = await requireUser(req);
    const songRef = adminDb.collection('users').doc(user.uid).collection('songs').doc(songId);
    const song = await songRef.get();
    if (!song.exists) {
      return res.status(404).json({ error: 'Song not found.' });
    }
    const canGenerate = isAdmin(user);

    if (req.method === 'GET') {
      return res.status(200).json({ canGenerate, items: await listSongAudio(songRef) });
    }

    if (!canGenerate) {
      throw new AppError('노래 만들기는 아직 준비 중이에요.', { statusCode: 403, code: 'FORBIDDEN' });
    }
    await enforceRateLimit(user.uid);

    const length: SongLength = req.body?.length === 'full' ? 'full' : 'clip';
    const lyrics = typeof song.get('lyrics') === 'string' ? (song.get('lyrics') as string).trim() : '';
    if (!lyrics) {
      throw new BadRequestError('가사가 비어 있어요.');
    }
    if (lyrics.length > MAX_SUNG_LYRICS) {
      throw new BadRequestError(`노래로 만들 가사는 ${MAX_SUNG_LYRICS}자 이하여야 해요.`);
    }
    if ((await countSongAudio(songRef)) >= MAX_AUDIO_PER_SONG) {
      throw new BadRequestError(`한 곡에는 노래를 ${MAX_AUDIO_PER_SONG}개까지 만들 수 있어요.`);
    }

    const style = song.get('metadata')?.style;
    const started = Date.now();
    const result = await generateSong({ length, style: typeof style === 'string' ? style : null, lyrics });
    const item = await saveSongAudio(user.uid, songRef, length, result);
    logInfo('music.generated', { uid: user.uid, songId, length, model: result.model, bytes: item.bytes, ms: Date.now() - started });

    return res.status(201).json({ item });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    logError('music.unexpected_error', error);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}
