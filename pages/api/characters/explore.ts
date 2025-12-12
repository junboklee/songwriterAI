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
    const characters = await adminDb.runTransaction(async tx => {
      const snapshot = await tx.get(
        adminDb
          .collection('characters')
          .orderBy('updatedAt', 'desc')
          .limit(Math.min(limit + 10, MAX_LIMIT * 2))
      );

      return snapshot.docs
        .map(doc => {
          const data = doc.data();

          if (typeof data.visibility !== 'string' || data.visibility !== 'public') {
            return null;
          }

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
            visibility: 'public',
            gender: normalizeString(data.gender) ?? 'none',
            avatarUrl: normalizeString(data.avatarUrl),
            categories,
            updatedAt: serializeTimestamp(data.updatedAt)
          };
        })
        .filter(Boolean)
        .slice(0, limit) as Array<Record<string, unknown>>;
    });

    return res.status(200).json({ characters });
  } catch (error) {
    console.error('Failed to list shared characters', error);
    return res.status(500).json({ error: 'Failed to load shared characters.' });
  }
}
