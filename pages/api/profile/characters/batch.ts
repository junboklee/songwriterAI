import type { NextApiRequest, NextApiResponse } from 'next';
import { FieldPath, Timestamp } from 'firebase-admin/firestore';

import { DEFAULT_CHARACTER_AVATAR } from '@/lib/constants';
import { adminDb } from '@/lib/firebaseAdmin';
import { serializeTimestamp } from '@/lib/firestoreUtils';
import { requireUser, UnauthorizedError } from '@/lib/serverAuth';

type CharacterDocument = {
  name?: string;
  shortDescription?: string | null;
  longDescription?: string | null;
  greeting?: string | null;
  instructions?: string | null;
  example?: string | null;
  visibility?: string | null;
  categories?: unknown;
  avatarUrl?: string | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
};

const CHUNK_SIZE = 10;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authUser = await requireUser(req);
    const body =
      typeof req.body === 'string'
        ? (JSON.parse(req.body) as { ids?: unknown })
        : (req.body as { ids?: unknown });

    if (!body?.ids || !Array.isArray(body.ids)) {
      return res.status(400).json({ error: 'ids must be an array.' });
    }

    const uniqueIds = Array.from(
      new Set(
        body.ids
          .map(id => (typeof id === 'string' ? id.trim() : ''))
          .filter(id => id.length > 0)
      )
    );

    if (!uniqueIds.length) {
      return res.status(400).json({ error: 'ids array cannot be empty.' });
    }

    const userRef = adminDb.collection('users').doc(authUser.uid);
    const results: Array<Record<string, unknown>> = [];

    for (let index = 0; index < uniqueIds.length; index += CHUNK_SIZE) {
      const chunk = uniqueIds.slice(index, index + CHUNK_SIZE);
      const snapshot = await userRef
        .collection('characters')
        .where(FieldPath.documentId(), 'in', chunk)
        .get();

      snapshot.docs.forEach(doc => {
        const data = doc.data() as CharacterDocument;
        results.push({
          id: doc.id,
          name: data.name ?? '',
          summary: (data.shortDescription as string) ?? null,
          greeting: (data.greeting as string) ?? null,
          longDescription: (data.longDescription as string) ?? null,
          instructions: (data.instructions as string) ?? null,
          example: (data.example as string) ?? null,
          visibility: (data.visibility as string) ?? null,
          avatarUrl:
            typeof data.avatarUrl === 'string' && data.avatarUrl.trim()
              ? data.avatarUrl
              : DEFAULT_CHARACTER_AVATAR,
          categories: Array.isArray(data.categories)
            ? data.categories.filter((category): category is string => typeof category === 'string')
            : [],
          createdAt: serializeTimestamp(data.createdAt),
          updatedAt: serializeTimestamp(data.updatedAt)
        });
      });
    }

    return res.status(200).json({ characters: results });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message });
    }

    console.error('Characters batch API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unexpected server error.'
    });
  }
}

