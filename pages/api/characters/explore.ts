import type { NextApiRequest, NextApiResponse } from 'next';

import { adminDb } from '@/lib/firebaseAdmin';
import { toPublicCharacter } from '@/lib/publicCharacter';
import { queryCharacterPool, topCategories, type ExploreSort } from '@/lib/exploreQuery';
import { getOptionalUser } from '@/lib/serverAuth';
import { logWarn } from '@/lib/logger';

const MAX_LIMIT = 24;
// Upper bound of public characters considered per request. Move search to a dedicated index
// (e.g. Algolia/Typesense) once the catalogue outgrows this.
const POOL_SIZE = 300;
const FAILED_PRECONDITION = 9;

const firstValue = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

const coerceLimit = (value: string | string[] | undefined) => {
  const parsed = Number(firstValue(value));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 12;
  }
  return Math.min(Math.trunc(parsed), MAX_LIMIT);
};

const coerceOffset = (value: string | string[] | undefined) => {
  const parsed = Number(firstValue(value));
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 0;
};

async function loadPublicDocs() {
  try {
    return (
      await adminDb
        .collection('characters')
        .where('visibility', '==', 'public')
        .orderBy('updatedAt', 'desc')
        .limit(POOL_SIZE)
        .get()
    ).docs;
  } catch (error) {
    // Composite index (firestore.indexes.json) not deployed yet: fall back to an unindexed scan.
    if ((error as { code?: number }).code !== FAILED_PRECONDITION) {
      throw error;
    }
    logWarn('explore.index_missing', { message: (error as Error).message });
    const docs = (await adminDb.collection('characters').orderBy('updatedAt', 'desc').limit(POOL_SIZE * 2).get()).docs;
    return docs.filter(doc => doc.get('visibility') === 'public');
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const sort: ExploreSort = firstValue(req.query.sort) === 'popular' ? 'popular' : 'recent';
    const docs = await loadPublicDocs();
    const pool = docs
      .filter(doc => doc.get('hidden') !== true)
      .map(doc => toPublicCharacter(doc.id, doc.data()));

    const page = queryCharacterPool(pool, {
      q: firstValue(req.query.q) ?? null,
      category: firstValue(req.query.category) ?? null,
      sort,
      offset: coerceOffset(req.query.cursor),
      limit: coerceLimit(req.query.limit)
    });

    const user = await getOptionalUser(req);
    let likedIds = new Set<string>();
    if (user && page.items.length) {
      const likesRef = adminDb.collection('users').doc(user.uid).collection('likedCharacters');
      const likeSnaps = await adminDb.getAll(...page.items.map(item => likesRef.doc(item.id)));
      likedIds = new Set(likeSnaps.filter(snap => snap.exists).map(snap => snap.id));
    }

    return res.status(200).json({
      characters: page.items.map(item => ({ ...item, likedByMe: likedIds.has(item.id) })),
      nextCursor: page.nextCursor,
      total: page.total,
      categories: topCategories(pool)
    });
  } catch (error) {
    console.error('Failed to list shared characters', error);
    return res.status(500).json({ error: 'Failed to load shared characters.' });
  }
}
