import type { NextApiRequest, NextApiResponse } from 'next';
import { Timestamp } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebaseAdmin';
import { deleteAllConversations, deleteConversations } from '@/lib/conversationCleanup';
import { requireUser, UnauthorizedError } from '@/lib/serverAuth';
import { serializeTimestamp } from '@/lib/firestoreUtils';

const MAX_LIMIT = 50;

type DeletePayload = {
  scope?: unknown;
  threadIds?: unknown;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['GET', 'DELETE'].includes(req.method ?? '')) {
    res.setHeader('Allow', 'GET, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authUser = await requireUser(req);

    if (req.method === 'DELETE') {
      const rawPayload: DeletePayload =
        typeof req.body === 'string' ? JSON.parse(req.body) : (req.body as DeletePayload);

      if (rawPayload?.scope === 'all') {
        await deleteAllConversations(authUser.uid);
        return res.status(204).end();
      }

      const rawThreadIds = rawPayload?.threadIds;
      if (!Array.isArray(rawThreadIds)) {
        return res
          .status(400)
          .json({ error: 'Provide threadIds array or set scope to "all".' });
      }

      const threadIds = rawThreadIds
        .map(id => (typeof id === 'string' ? id.trim() : ''))
        .filter(id => id.length > 0);

      if (!threadIds.length) {
        return res.status(400).json({ error: 'threadIds must contain at least one value.' });
      }

      await deleteConversations({ userId: authUser.uid, threadIds });
      return res.status(204).end();
    }

    const userRef = adminDb.collection('users').doc(authUser.uid);
    const { limit = '20', cursor } = req.query;
    const characterParam = Array.isArray(req.query.characterId)
      ? req.query.characterId[0]
      : req.query.characterId;
    const characterIdFilter =
      typeof characterParam === 'string' && characterParam.trim()
        ? characterParam.trim()
        : null;

    let parsedLimit = Number(Array.isArray(limit) ? limit[0] : limit);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      parsedLimit = 20;
    }
    parsedLimit = Math.min(parsedLimit, MAX_LIMIT);

    let conversationsQuery = userRef.collection('conversations') as FirebaseFirestore.Query;

    if (characterIdFilter) {
      conversationsQuery = conversationsQuery.where('characterId', '==', characterIdFilter);
    }

    conversationsQuery = conversationsQuery.orderBy('updatedAt', 'desc').limit(parsedLimit + 1);

    const cursorParam = Array.isArray(cursor) ? cursor[0] : cursor;
    if (cursorParam) {
      const cursorMillis = Number(cursorParam);
      if (Number.isFinite(cursorMillis) && cursorMillis > 0) {
        conversationsQuery = conversationsQuery.startAfter(Timestamp.fromMillis(cursorMillis));
      }
    }

    const snapshot = await conversationsQuery.get();
    const docs = snapshot.docs;
    const items = docs.slice(0, parsedLimit).map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        threadId: (data.threadId as string | undefined) ?? doc.id,
        title: (data.title as string | undefined) ?? null,
        lastMessagePreview: (data.lastMessagePreview as string | undefined) ?? '',
        lastMessageRole: (data.lastMessageRole as string | undefined) ?? null,
        lastMessageId: (data.lastMessageId as string | undefined) ?? null,
        characterId: (data.characterId as string | undefined) ?? null,
        messageCount: Number(data.messageCount) || 0,
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt)
      };
    });

    const hasMore = docs.length > parsedLimit;
    const nextCursorDoc = hasMore ? docs[parsedLimit] : null;
    const nextCursor =
      nextCursorDoc && nextCursorDoc.data().updatedAt instanceof Timestamp
        ? nextCursorDoc.data().updatedAt.toMillis()
        : null;

    return res.status(200).json({
      conversations: items,
      nextCursor
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message });
    }

    console.error('Conversations API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error.'
    });
  }
}
