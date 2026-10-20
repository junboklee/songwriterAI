import type { NextApiRequest, NextApiResponse } from 'next';
import { FieldValue } from 'firebase-admin/firestore';

import { AppError } from '@/lib/errors';
import { adminDb } from '@/lib/firebaseAdmin';
import { logInfo } from '@/lib/logger';
import { enforceRateLimit } from '@/lib/rateLimiter';
import { requireUser, UnauthorizedError } from '@/lib/serverAuth';

// Features shown as "coming soon" to measure demand before they are built.
const INTEREST_FEATURES = new Set(['sing', 'gift']);

// Records that a signed-in user wants a coming-soon feature: one vote per user and feature
// (featureInterest/{feature}_{uid}) plus a running count (featureInterestCounts/{feature}).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const user = await requireUser(req);
    const feature = typeof req.body?.feature === 'string' ? req.body.feature : '';
    if (!INTEREST_FEATURES.has(feature)) {
      return res.status(400).json({ error: 'Unknown feature.' });
    }
    await enforceRateLimit(`interest:${user.uid}`);

    const voteRef = adminDb.collection('featureInterest').doc(`${feature}_${user.uid}`);
    const countRef = adminDb.collection('featureInterestCounts').doc(feature);
    const isNew = await adminDb.runTransaction(async tx => {
      const vote = await tx.get(voteRef);
      if (vote.exists) {
        return false;
      }
      tx.set(voteRef, { feature, uid: user.uid, createdAt: FieldValue.serverTimestamp() });
      tx.set(countRef, { count: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      return true;
    });

    logInfo('interest.recorded', { feature, isNew });
    return res.status(200).json({ ok: true, isNew });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return res.status(401).json({ error: error.message });
    }
    if (error instanceof AppError && error.statusCode < 500) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Interest API error:', error);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}
