import type { NextApiRequest, NextApiResponse } from 'next';
import { Timestamp } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebaseAdmin';
import { requireUser, UnauthorizedError } from '@/lib/serverAuth';
import { serializeTimestamp } from '@/lib/firestoreUtils';

const MAX_LIMIT = 50;
const MAX_BATCH = 400;

type SongInsertPayload = {
  title?: unknown;
  lyrics?: unknown;
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

      const now = Timestamp.now();
      const songRef = userRef.collection('songs').doc();

      await songRef.set({
        title,
        lyrics: rawLyrics,
        characterId,
        threadId,
        metadata,
        createdAt: now,
        updatedAt: now
      });

      const stored = await songRef.get();
      const data = stored.data() ?? {};

      return res.status(201).json({
        song: {
          id: songRef.id,
          title: (data.title as string | undefined) ?? title,
          lyrics: (data.lyrics as string | undefined) ?? rawLyrics,
          characterId: characterId,
          threadId: threadId,
          metadata,
          createdAt: serializeTimestamp(data.createdAt),
          updatedAt: serializeTimestamp(data.updatedAt)
        }
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
      const items = docs.slice(0, parsedLimit).map(doc => {
        const data = doc.data();
        const metadata =
          data.metadata && typeof data.metadata === 'object' ? data.metadata : {};
        return {
          id: doc.id,
          title: (data.title as string | undefined) ?? null,
          lyrics: (data.lyrics as string | undefined) ?? '',
          prompt: (data.prompt as string | undefined) ?? null,
          characterId: (data.characterId as string | undefined) ?? null,
          threadId: (data.threadId as string | undefined) ?? null,
          metadata,
          createdAt: serializeTimestamp(data.createdAt),
          updatedAt: serializeTimestamp(data.updatedAt)
        };
      });

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

      const collectRefs = async () => {
        if (deleteAll) {
          const snapshot = await userRef.collection('songs').get();
          return snapshot.docs.map(doc => doc.ref);
        }
        return ids.map(id => userRef.collection('songs').doc(id));
      };

      const refs = await collectRefs();
      if (refs.length === 0) {
        return res.status(200).json({ deletedCount: 0 });
      }

      for (let i = 0; i < refs.length; i += MAX_BATCH) {
        const batch = adminDb.batch();
        refs.slice(i, i + MAX_BATCH).forEach(ref => batch.delete(ref));
        await batch.commit();
      }

      return res.status(200).json({ deletedCount: refs.length });
    }

  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message });
    }

    console.error('Songs API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error.'
    });
  }
}
