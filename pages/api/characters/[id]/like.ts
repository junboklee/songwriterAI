import type { NextApiRequest, NextApiResponse } from 'next';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebaseAdmin';
import { requireUser, UnauthorizedError } from '@/lib/serverAuth';

// POST likes a public character, DELETE removes the like. Both are idempotent.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const characterId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!characterId) {
    return res.status(400).json({ error: 'Invalid character ID' });
  }

  try {
    const user = await requireUser(req);
    const characterRef = adminDb.collection('characters').doc(characterId);
    const likeRef = adminDb
      .collection('users')
      .doc(user.uid)
      .collection('likedCharacters')
      .doc(characterId);
    const liking = req.method === 'POST';

    const likeCount = await adminDb.runTransaction(async tx => {
      const [characterSnap, likeSnap] = await Promise.all([tx.get(characterRef), tx.get(likeRef)]);
      if (!characterSnap.exists || characterSnap.get('visibility') === 'private') {
        return null;
      }

      const current = Math.max(0, Number(characterSnap.get('likeCount')) || 0);
      if (liking === likeSnap.exists) {
        return current;
      }

      if (liking) {
        tx.set(likeRef, { createdAt: Timestamp.now() });
      } else {
        tx.delete(likeRef);
      }
      tx.update(characterRef, { likeCount: FieldValue.increment(liking ? 1 : -1) });
      return Math.max(0, current + (liking ? 1 : -1));
    });

    if (likeCount === null) {
      return res.status(404).json({ error: 'Character not found or is private.' });
    }

    return res.status(200).json({ liked: liking, likeCount });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message });
    }
    console.error('Character like API error:', error);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}
