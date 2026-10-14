import type { NextApiRequest, NextApiResponse } from 'next';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { requireAdmin } from '@/lib/adminAuth';
import { AppError, BadRequestError } from '@/lib/errors';
import { adminDb } from '@/lib/firebaseAdmin';
import { logInfo } from '@/lib/logger';

const ACTIONS = ['hide', 'restore', 'dismiss', 'unpublish'] as const;
type ModerationAction = (typeof ACTIONS)[number];

// Report status recorded for each action. 'dismissed' = reports judged unfounded.
const REPORT_STATUS: Record<ModerationAction, 'actioned' | 'dismissed'> = {
  hide: 'actioned',
  unpublish: 'actioned',
  restore: 'dismissed',
  dismiss: 'dismissed'
};

// POST { action } on a reported public character:
//   hide      - remove from public listings, keep the reports as handled
//   restore   - show again and clear the report counter
//   dismiss   - keep visible, close the reports
//   unpublish - make the owner's character private and delete the public copy (owner keeps it)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const characterId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  const action = (req.body ?? {}).action as ModerationAction;

  try {
    const admin = await requireAdmin(req);
    if (!characterId || !ACTIONS.includes(action)) {
      throw new BadRequestError('A character id and a valid action are required.');
    }

    const publicRef = adminDb.collection('characters').doc(characterId);
    const publicSnap = await publicRef.get();
    if (!publicSnap.exists) {
      throw new AppError('Character not found.', { statusCode: 404, code: 'NOT_FOUND' });
    }

    const openReports = await adminDb
      .collection('characterReports')
      .where('characterId', '==', characterId)
      .where('status', '==', 'open')
      .get();

    const now = Timestamp.now();
    const batch = adminDb.batch();

    if (action === 'hide') {
      batch.update(publicRef, { hidden: true, moderatedAt: now });
    } else if (action === 'restore') {
      batch.update(publicRef, { hidden: false, reportCount: 0, moderatedAt: now });
    } else if (action === 'dismiss') {
      batch.update(publicRef, { reportCount: 0, moderatedAt: now });
    } else {
      const creatorId = publicSnap.get('creatorId');
      if (typeof creatorId === 'string' && creatorId) {
        const ownerRef = adminDb.collection('users').doc(creatorId).collection('characters').doc(characterId);
        if ((await ownerRef.get()).exists) {
          batch.update(ownerRef, { visibility: 'private', updatedAt: now });
        }
      }
      batch.delete(publicRef);
    }

    openReports.docs.forEach(doc =>
      batch.update(doc.ref, {
        status: REPORT_STATUS[action],
        resolvedAt: now,
        resolvedBy: admin.uid,
        resolution: action,
        updatedAt: FieldValue.serverTimestamp()
      })
    );

    await batch.commit();
    logInfo('admin.character_moderated', { characterId, action, by: admin.uid, reports: openReports.size });

    return res.status(200).json({ ok: true, action, resolvedReports: openReports.size });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    console.error('Admin moderation API error:', error);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}
