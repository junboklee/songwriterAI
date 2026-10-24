// Generated song audio: the mp3 lives in Cloud Storage under songAudio/{uid}/{songId}/ and its
// metadata in users/{uid}/songs/{songId}/audio/{audioId}. Files are served only through the API
// (owner check), never by public URL.
import { randomUUID } from 'crypto';
import type { DocumentReference } from 'firebase-admin/firestore';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { adminStorage } from '@/lib/firebaseAdmin';
import { logWarn } from '@/lib/logger';
import type { LyriaResult, SongLength } from '@/lib/music/lyria';

export const MAX_AUDIO_PER_SONG = 20;

const folderOf = (uid: string, songId?: string) => (songId ? `songAudio/${uid}/${songId}/` : `songAudio/${uid}/`);

export type SongAudioItem = {
  id: string;
  length: SongLength;
  model: string;
  bytes: number;
  caption: string | null;
  createdAt: string | null;
};

const serialize = (id: string, data: FirebaseFirestore.DocumentData): SongAudioItem => ({
  id,
  length: data.length === 'full' ? 'full' : 'clip',
  model: typeof data.model === 'string' ? data.model : '',
  bytes: typeof data.bytes === 'number' ? data.bytes : 0,
  caption: typeof data.caption === 'string' ? data.caption : null,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : null
});

export async function saveSongAudio(
  uid: string,
  songRef: DocumentReference,
  length: SongLength,
  result: LyriaResult
): Promise<SongAudioItem> {
  const id = randomUUID();
  const storagePath = `${folderOf(uid, songRef.id)}${id}.mp3`;
  await adminStorage.bucket().file(storagePath).save(result.audio, {
    resumable: false,
    metadata: { contentType: result.mimeType }
  });
  const data = {
    length,
    model: result.model,
    storagePath,
    bytes: result.audio.length,
    caption: result.caption,
    sungLyrics: result.sungLyrics,
    // AI 기본법: the audio is AI-generated; the UI labels it as such.
    aiGenerated: true,
    createdAt: FieldValue.serverTimestamp()
  };
  await songRef.collection('audio').doc(id).set(data);
  return { ...serialize(id, data), createdAt: new Date().toISOString() };
}

export async function listSongAudio(songRef: DocumentReference): Promise<SongAudioItem[]> {
  const snapshot = await songRef.collection('audio').orderBy('createdAt', 'desc').limit(MAX_AUDIO_PER_SONG).get();
  return snapshot.docs.map(doc => serialize(doc.id, doc.data()));
}

export const countSongAudio = async (songRef: DocumentReference) =>
  (await songRef.collection('audio').count().get()).data().count;

export async function readSongAudio(uid: string, songRef: DocumentReference, audioId: string) {
  const snapshot = await songRef.collection('audio').doc(audioId).get();
  const storagePath = snapshot.get('storagePath');
  // Only files inside this user's song folder are ever read.
  if (!snapshot.exists || typeof storagePath !== 'string' || !storagePath.startsWith(folderOf(uid, songRef.id))) {
    return null;
  }
  const file = adminStorage.bucket().file(storagePath);
  const [[buffer], [metadata]] = await Promise.all([file.download(), file.getMetadata()]);
  return { buffer, contentType: metadata.contentType ?? 'audio/mpeg' };
}

// Removes the audio files of one song, or of every song when songId is omitted. Firestore metadata
// is removed by the callers' recursive deletes. Failures are logged rather than blocking deletion.
export async function deleteSongAudioFiles(uid: string, songId?: string) {
  try {
    await adminStorage.bucket().deleteFiles({ prefix: folderOf(uid, songId) });
  } catch (error) {
    logWarn('music.audio_delete_failed', { uid, songId: songId ?? null, message: (error as Error)?.message });
  }
}
