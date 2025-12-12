import type { NextApiRequest, NextApiResponse } from 'next';

import { adminDb } from '@/lib/firebaseAdmin';
import { serializeTimestamp } from '@/lib/firestoreUtils';

const MAX_LIMIT = 24;

const coerceLimit = (value: string | string[] | undefined) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 12;
  }
  return Math.min(Math.trunc(parsed), MAX_LIMIT);
};

const normalizeString = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = coerceLimit(req.query.limit);
    const snapshot = await adminDb
      .collection('characters')
      .where('visibility', '==', 'public')
      .orderBy('updatedAt', 'desc')
      .limit(limit)
      .get();

    const characters = snapshot.docs.map(doc => {
      const data = doc.data();
      const categories = Array.isArray(data.categories)
        ? data.categories.filter(
            (item): item is string => typeof item === 'string' && item.trim().length > 0
          )
        : [];

      return {
        id: doc.id,
        name: normalizeString(data.name),
        summary: normalizeString(data.shortDescription ?? data.summary),
        greeting: normalizeString(data.greeting),
        longDescription: normalizeString(data.longDescription),
        instructions: normalizeString(data.instructions),
        example: normalizeString(data.example),
        visibility: normalizeString(data.visibility),
        gender: normalizeString(data.gender) ?? 'none',
        avatarUrl: normalizeString(data.avatarUrl),
        categories,
        updatedAt: serializeTimestamp(data.updatedAt)
      };
    });

    return res.status(200).json({ characters });
  } catch (error) {
    console.error('Failed to list shared characters', error);
    return res.status(500).json({ error: 'Failed to load shared characters.' });
  }
}
