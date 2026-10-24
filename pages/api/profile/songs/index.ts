import type { NextApiRequest, NextApiResponse } from 'next';
import { Timestamp } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebaseAdmin';
import { deleteSongAudioFiles } from '@/lib/music/songAudio';
import { AgeConfirmationRequiredError } from '@/lib/errors';
import { requireUser, UnauthorizedError } from '@/lib/serverAuth';
import {
  appendSongVersion,
  deleteSharedSongsByOwner,
  deleteSongDeep,
  findAutoSaveTarget,
  serializeSong
} from '@/lib/songVersions';

const MAX_LIMIT = 50;

type SongInsertPayload = {
  title?: unknown;
  lyrics?: unknown;
  prompt?: unknown;
  characterId?: unknown;
  threadId?: unknown;
  metadata?: unknown;
};

type SongDeletePayload = {
  ids?: unknown;
  deleteAll?: unknown;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method ?? '')) {
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authUser = await requireUser(req);
    const userRef = adminDb.collection('users').doc(authUser.uid);

    if (req.method === 'POST') {
      const rawPayload =
        typeof req.body === 'string' ? (JSON.parse(req.body) as SongInsertPayload) : (req.body as SongInsertPayload);

      const rawLyrics =
        typeof rawPayload?.lyrics === 'string' ? rawPayload.lyrics.trim() : '';

      if (!rawLyrics) {
        return res.status(400).json({ error: 'lyrics is required.' });
      }

      const title =
        typeof rawPayload?.title === 'string' && rawPayload.title.trim()
          ? rawPayload.title.trim()
          : null;

      const characterId =
        typeof rawPayload?.characterId === 'string' && rawPayload.characterId.trim()
          ? rawPayload.characterId.trim()
          : null;

      const threadId =
        typeof rawPayload?.threadId === 'string' && rawPayload.threadId.trim()
          ? rawPayload.threadId.trim()
          : null;

      const metadata =
        rawPayload?.metadata && typeof rawPayload.metadata === 'object'
          ? rawPayload.metadata
          : {};
      const prompt =
        typeof rawPayload?.prompt === 'string' && rawPayload.prompt.trim()
          ? rawPayload.prompt.trim()
          : null;

      const style =
        typeof (metadata as Record<string, unknown>).style === 'string'
          ? ((metadata as Record<string, unknown>).style as string)
          : null;

      // Repeated auto-saves of the same song in one conversation become new versions.
      if ((metadata as Record<string, unknown>).source === 'auto-from-chat' && threadId) {
        const existingRef = await findAutoSaveTarget(authUser.uid, threadId, title);
        if (existingRef) {
          await appendSongVersion(existingRef, {
            title,
            lyrics: rawLyrics,
            style,
            source: 'auto-from-chat'
          });
          const updated = await existingRef.get();
          return res.status(200).json({
            song: serializeSong(existingRef.id, updated.data() ?? {}),
            revised: true
          });
        }
      }

      const now = Timestamp.now();
      const songRef = userRef.collection('songs').doc();
      const batch = adminDb.batch();

      batch.set(songRef, {
        title,
        lyrics: rawLyrics,
        prompt,
        characterId,
        threadId,
        metadata,
        versionCount: 1,
        createdAt: now,
        updatedAt: now
      });
      batch.set(songRef.collection('versions').doc(), {
        title,
        lyrics: rawLyrics,
        style,
        source:
          (metadata as Record<string, unknown>).source === 'auto-from-chat'
            ? 'auto-from-chat'
            : 'manual',
        createdAt: now
      });
      await batch.commit();

      const stored = await songRef.get();
      return res.status(201).json({
        song: serializeSong(songRef.id, stored.data() ?? {}),
        revised: false
      });
    }

    const { limit = '20', cursor } = req.query;
    let parsedLimit = Number(Array.isArray(limit) ? limit[0] : limit);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      parsedLimit = 20;
    }
    parsedLimit = Math.min(parsedLimit, MAX_LIMIT);

    let query = userRef.collection('songs').orderBy('createdAt', 'desc').limit(parsedLimit + 1);

    const cursorParam = Array.isArray(cursor) ? cursor[0] : cursor;
    if (cursorParam) {
      const cursorMillis = Number(cursorParam);
      if (Number.isFinite(cursorMillis) && cursorMillis > 0) {
        query = query.startAfter(Timestamp.fromMillis(cursorMillis));
      }
    }

    if (req.method === 'GET') {
      const snapshot = await query.get();
      const docs = snapshot.docs;
      const items = docs.slice(0, parsedLimit).map(doc => serializeSong(doc.id, doc.data()));

      const hasMore = docs.length > parsedLimit;
      const nextCursorDoc = hasMore ? docs[parsedLimit] : null;
      const nextCursor =
        nextCursorDoc && nextCursorDoc.data().createdAt instanceof Timestamp
          ? nextCursorDoc.data().createdAt.toMillis()
          : null;

      return res.status(200).json({
        songs: items,
        nextCursor
      });
    }

    if (req.method === 'DELETE') {
      const rawPayload =
        typeof req.body === 'string'
          ? (JSON.parse(req.body) as SongDeletePayload)
          : ((req.body ?? {}) as SongDeletePayload);

      const deleteAll = rawPayload?.deleteAll === true;
      const ids =
        Array.isArray(rawPayload?.ids) && rawPayload.ids.length
          ? rawPayload.ids
              .map(id => (typeof id === 'string' ? id.trim() : ''))
              .filter(id => id.length > 0)
          : [];

      if (!deleteAll && ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required to delete selected songs.' });
      }

      if (deleteAll) {
        const count = (await userRef.collection('songs').count().get()).data().count;
        // recursiveDelete also removes each song's versions subcollection.
        await deleteSharedSongsByOwner(authUser.uid);
        await deleteSongAudioFiles(authUser.uid);
        await adminDb.recursiveDelete(userRef.collection('songs'));
        return res.status(200).json({ deletedCount: count });
      }

      const refs = ids.map(id => userRef.collection('songs').doc(id));
      await Promise.all(refs.map(ref => deleteSongDeep(ref)));

      return res.status(200).json({ deletedCount: refs.length });
    }

  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message });
    }
    if (error instanceof AgeConfirmationRequiredError) {
      return res.status(403).json({ error: error.message, code: error.code });
    }

    console.error('Songs API error:', error);
    return res.status(500).json({
      error: 'Unexpected server error.'
    });
  }
}
