import type { NextApiRequest, NextApiResponse } from 'next';
import { Timestamp } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebaseAdmin';
import { serializeTimestamp } from '@/lib/firestoreUtils';
import { requireUser, UnauthorizedError } from '@/lib/serverAuth';
import { DEFAULT_CHARACTER_AVATAR } from '@/lib/constants';

const MAX_LIMIT = 50;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authUser = await requireUser(req);
    const userRef = adminDb.collection('users').doc(authUser.uid);

    const { limit = '20', cursor } = req.query;
    let parsedLimit = Number(Array.isArray(limit) ? limit[0] : limit);
    if (!Number.isFinite(parsedLimit) || parsedLimit <= 0) {
      parsedLimit = 20;
    }
    parsedLimit = Math.min(parsedLimit, MAX_LIMIT);

    let query = userRef
      .collection('characters')
      .orderBy('updatedAt', 'desc')
      .limit(parsedLimit + 1);

    const cursorParam = Array.isArray(cursor) ? cursor[0] : cursor;
    if (cursorParam) {
      const cursorMillis = Number(cursorParam);
      if (Number.isFinite(cursorMillis) && cursorMillis > 0) {
        const cursorTimestamp = Timestamp.fromMillis(cursorMillis);
        query = query.startAfter(cursorTimestamp);
      }
    }

    const snapshot = await query.get();
    const docs = snapshot.docs;

    const items = docs.slice(0, parsedLimit).map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: (data.name as string) ?? '',
        summary: (data.shortDescription as string | null) ?? null,
        greeting: (data.greeting as string | null) ?? null,
        longDescription: (data.longDescription as string | null) ?? null,
        instructions: (data.instructions as string | null) ?? null,
        example: (data.example as string | null) ?? null,
        visibility: (data.visibility as string | null) ?? null,
        avatarUrl:
          typeof data.avatarUrl === 'string' && data.avatarUrl.trim()
            ? data.avatarUrl
            : DEFAULT_CHARACTER_AVATAR,
        categories: Array.isArray(data.categories)
          ? data.categories.filter(
              (category: unknown): category is string => typeof category === 'string'
            )
          : [],
        createdAt: serializeTimestamp(data.createdAt),
        updatedAt: serializeTimestamp(data.updatedAt)
      };
    });

    const hasMore = docs.length > parsedLimit;
    const nextCursorDoc = hasMore ? docs[parsedLimit] : null;
    const nextCursor =
      nextCursorDoc && nextCursorDoc.data().updatedAt instanceof Timestamp
        ? nextCursorDoc.data().updatedAt.toMillis()
        : nextCursorDoc && nextCursorDoc.data().createdAt instanceof Timestamp
        ? nextCursorDoc.data().createdAt.toMillis()
        : null;

    return res.status(200).json({
      characters: items,
      nextCursor
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message });
    }

    console.error('Characters API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error.'
    });
  }
}
