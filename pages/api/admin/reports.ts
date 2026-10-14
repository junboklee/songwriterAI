import type { NextApiRequest, NextApiResponse } from 'next';

import { requireAdmin } from '@/lib/adminAuth';
import { AppError } from '@/lib/errors';
import { adminDb } from '@/lib/firebaseAdmin';
import { serializeTimestamp } from '@/lib/firestoreUtils';

const MAX_REPORTS = 500;

// Open reports grouped by character, most reported first. Characters hidden by the automatic
// threshold are included even if their reports were already handled elsewhere.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await requireAdmin(req);

    const [reportsSnap, hiddenSnap] = await Promise.all([
      adminDb.collection('characterReports').where('status', '==', 'open').limit(MAX_REPORTS).get(),
      adminDb.collection('characters').where('hidden', '==', true).limit(MAX_REPORTS).get()
    ]);

    const groups = new Map<string, Array<Record<string, unknown>>>();
    reportsSnap.docs.forEach(doc => {
      const data = doc.data();
      const characterId = typeof data.characterId === 'string' ? data.characterId : null;
      if (!characterId) return;
      const list = groups.get(characterId) ?? [];
      list.push({
        id: doc.id,
        reason: data.reason ?? 'other',
        detail: typeof data.detail === 'string' ? data.detail : null,
        reporterId: data.reporterId ?? null,
        createdAt: serializeTimestamp(data.createdAt)
      });
      groups.set(characterId, list);
    });
    hiddenSnap.docs.forEach(doc => {
      if (!groups.has(doc.id)) groups.set(doc.id, []);
    });

    const characterIds = Array.from(groups.keys());
    const characterSnaps = characterIds.length
      ? await adminDb.getAll(...characterIds.map(id => adminDb.collection('characters').doc(id)))
      : [];

    const items = characterSnaps
      .map(snap => {
        const data = snap.data() ?? {};
        const reports = (groups.get(snap.id) ?? []).sort((a, b) =>
          String(b.createdAt ?? '').localeCompare(String(a.createdAt ?? ''))
        );
        return {
          characterId: snap.id,
          exists: snap.exists,
          name: typeof data.name === 'string' ? data.name : '(삭제된 캐릭터)',
          avatarUrl: typeof data.avatarUrl === 'string' ? data.avatarUrl : null,
          shortDescription: typeof data.shortDescription === 'string' ? data.shortDescription : null,
          longDescription: typeof data.longDescription === 'string' ? data.longDescription : null,
          visibility: data.visibility ?? null,
          hidden: data.hidden === true,
          reportCount: typeof data.reportCount === 'number' ? data.reportCount : reports.length,
          creatorId: data.creatorId ?? null,
          reports
        };
      })
      .sort((a, b) => Number(b.hidden) - Number(a.hidden) || b.reports.length - a.reports.length);

    return res.status(200).json({ items });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    console.error('Admin reports API error:', error);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}
