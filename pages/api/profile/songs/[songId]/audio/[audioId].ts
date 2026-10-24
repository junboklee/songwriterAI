import type { NextApiRequest, NextApiResponse } from 'next';

import { AppError } from '@/lib/errors';
import { adminDb } from '@/lib/firebaseAdmin';
import { logError } from '@/lib/logger';
import { readSongAudio } from '@/lib/music/songAudio';
import { requireUser } from '@/lib/serverAuth';

const param = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

// GET -> the mp3 of one generated song, for its owner only (private cache).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const songId = param(req.query.songId);
  const audioId = param(req.query.audioId);
  if (!songId || !audioId) {
    return res.status(400).json({ error: 'songId and audioId are required.' });
  }

  try {
    const user = await requireUser(req);
    const songRef = adminDb.collection('users').doc(user.uid).collection('songs').doc(songId);
    const audio = await readSongAudio(user.uid, songRef, audioId);
    if (!audio) {
      return res.status(404).json({ error: 'Audio not found.' });
    }
    res.setHeader('Content-Type', audio.contentType);
    res.setHeader('Content-Length', String(audio.buffer.length));
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.status(200).send(audio.buffer);
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    logError('music.audio_read_failed', error);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}
