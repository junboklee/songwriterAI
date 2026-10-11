import type { NextApiRequest, NextApiResponse } from 'next';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebaseAdmin';
import { enforceRateLimit } from '@/lib/rateLimiter';
import { AppError } from '@/lib/errors';
import { requireUser } from '@/lib/serverAuth';

const REPORT_REASONS = ['inappropriate', 'copyright', 'spam', 'other'] as const;
type ReportReason = (typeof REPORT_REASONS)[number];

const MAX_DETAIL_LENGTH = 500;

// Distinct reporters needed before a public character is hidden pending manual review.
const hideThreshold = () => {
  const parsed = Number(process.env.CHARACTER_REPORT_HIDE_THRESHOLD);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : 5;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const characterId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const { reason, detail } = (req.body ?? {}) as { reason?: unknown; detail?: unknown };

  if (!characterId || !REPORT_REASONS.includes(reason as ReportReason)) {
    return res.status(400).json({ error: 'A valid character and reason are required.' });
  }

  try {
    const user = await requireUser(req);
    await enforceRateLimit(`report:${user.uid}`);

    const characterRef = adminDb.collection('characters').doc(characterId);
    // One report per user per character; repeated submissions update the same document.
    const reportRef = adminDb.collection('characterReports').doc(`${characterId}_${user.uid}`);

    const found = await adminDb.runTransaction(async tx => {
      const [characterSnap, reportSnap] = await Promise.all([tx.get(characterRef), tx.get(reportRef)]);
      if (!characterSnap.exists) {
        return false;
      }
      if (characterSnap.get('creatorId') === user.uid) {
        throw new AppError('자신의 캐릭터는 신고할 수 없습니다.', { statusCode: 400, code: 'BAD_REQUEST' });
      }

      tx.set(reportRef, {
        characterId,
        reporterId: user.uid,
        reason,
        detail: typeof detail === 'string' ? detail.trim().slice(0, MAX_DETAIL_LENGTH) : null,
        status: 'open',
        createdAt: reportSnap.exists ? reportSnap.get('createdAt') : Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      if (!reportSnap.exists) {
        const reportCount = (Number(characterSnap.get('reportCount')) || 0) + 1;
        tx.update(characterRef, {
          reportCount: FieldValue.increment(1),
          ...(reportCount >= hideThreshold() ? { hidden: true } : {})
        });
      }
      return true;
    });

    if (!found) {
      return res.status(404).json({ error: 'Character not found.' });
    }

    return res.status(200).json({ reported: true });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    console.error('Character report API error:', error);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}
