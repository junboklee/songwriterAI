import type { NextApiRequest, NextApiResponse } from 'next';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebaseAdmin';
import { deleteConversation } from '@/lib/conversationCleanup';
import { requireUser, UnauthorizedError } from '@/lib/serverAuth';
import { serializeTimestamp } from '@/lib/firestoreUtils';

const MAX_LIMIT = 100;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!['GET', 'DELETE'].includes(req.method ?? '')) {
    res.setHeader('Allow', 'GET, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authUser = await requireUser(req);
    const threadIdParam = req.query.threadId;
    const threadId = Array.isArray(threadIdParam) ? threadIdParam[0] : threadIdParam;

    if (!threadId) {
      return res.status(400).json({ error: 'threadId is required.' });
    }

    const userRef = adminDb.collection('users').doc(authUser.uid);

    if (req.method === 'DELETE') {
      await deleteConversation({ userId: authUser.uid, threadId });
      return res.status(204).end();
    }

    const conversationRef = userRef.collection('conversations').doc(threadId);
    const conversationSnapshot = await conversationRef.get();

    if (!conversationSnapshot.exists) {
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    const conversationData = conversationSnapshot.data() ?? {};

    const { limit = '50', cursor } = req.query;
    let parsedLimit = Number(Array.isArray(limit) ? limit[0] : limit);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      parsedLimit = 50;
    }
    parsedLimit = Math.min(parsedLimit, MAX_LIMIT);

    let messagesQuery = conversationRef
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .limit(parsedLimit + 1);

    const cursorParam = Array.isArray(cursor) ? cursor[0] : cursor;
    if (cursorParam) {
      const cursorMillis = Number(cursorParam);
      if (Number.isFinite(cursorMillis) && cursorMillis > 0) {
        messagesQuery = messagesQuery.startAfter(Timestamp.fromMillis(cursorMillis));
      }
    }

    const messagesSnapshot = await messagesQuery.get();
    const messageDocs = messagesSnapshot.docs;

    const messages = messageDocs.slice(0, parsedLimit).map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        role: (data.role as string | undefined) ?? 'assistant',
        content: (data.content as string | undefined) ?? '',
        characterId: (data.characterId as string | undefined) ?? null,
        createdAt: serializeTimestamp(data.createdAt)
      };
    });

    const hasMore = messageDocs.length > parsedLimit;
    const nextCursorDoc = hasMore ? messageDocs[parsedLimit] : null;
    const nextCursor =
      nextCursorDoc && nextCursorDoc.data().createdAt instanceof Timestamp
        ? nextCursorDoc.data().createdAt.toMillis()
        : null;

    return res.status(200).json({
      conversation: {
        id: conversationSnapshot.id,
        threadId: (conversationData.threadId as string | undefined) ?? conversationSnapshot.id,
        title: (conversationData.title as string | undefined) ?? null,
        characterId: (conversationData.characterId as string | undefined) ?? null,
        messageCount: Number(conversationData.messageCount) || messages.length,
        lastMessagePreview: (conversationData.lastMessagePreview as string | undefined) ?? '',
        createdAt: serializeTimestamp(conversationData.createdAt),
        updatedAt: serializeTimestamp(conversationData.updatedAt)
      },
      messages,
      nextCursor
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message });
    }

    console.error('Conversation detail API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error.'
    });
  }
}
