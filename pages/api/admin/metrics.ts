import type { NextApiRequest, NextApiResponse } from 'next';

import { requireAdmin } from '@/lib/adminAuth';
import { seoulDate, summarizeMembers, summarizeSongs, summarizeUsage, type MemberRow } from '@/lib/adminMetrics';
import { AppError } from '@/lib/errors';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { logError } from '@/lib/logger';
import { currentMonthKey } from '@/lib/usage';

const MAX_PAGES = 10;
const SCAN_LIMIT = 5000;

const testerUids = () =>
  (process.env.MUSIC_TESTER_UIDS ?? '')
    .split(',')
    .map(uid => uid.trim())
    .filter(Boolean);

async function loadMembers(): Promise<MemberRow[]> {
  const rows: MemberRow[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await adminAuth.listUsers(1000, pageToken);
    result.users.forEach(user => {
      const lastActive = user.metadata.lastRefreshTime ?? user.metadata.lastSignInTime;
      rows.push({
        uid: user.uid,
        createdAt: user.metadata.creationTime ? new Date(user.metadata.creationTime) : null,
        lastActiveAt: lastActive ? new Date(lastActive) : null,
        adultConfirmed: Boolean(user.customClaims?.adultConfirmedAt),
        identityVerified: Boolean(user.customClaims?.identityVerifiedAt)
      });
    });
    pageToken = result.pageToken;
    if (!pageToken) break;
  }
  return rows;
}

// GET -> totals for /admin/metrics. Test accounts (MUSIC_TESTER_UIDS) are left out of the counts.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await requireAdmin(req);
    const exclude = testerUids();
    const now = new Date();
    const today = seoulDate(now);
    const yesterday = seoulDate(new Date(now.getTime() - 86_400_000));

    const [members, usageSnap, songsSnap, audioCount, trialToday, trialYesterday, interestSnap] = await Promise.all([
      loadMembers(),
      adminDb.collectionGroup('usage').limit(SCAN_LIMIT).get(),
      adminDb.collectionGroup('songs').select('metadata').limit(SCAN_LIMIT).get(),
      adminDb.collectionGroup('audio').count().get(),
      adminDb.collection('_trialUsage').doc(`${today}_all`).get(),
      adminDb.collection('_trialUsage').doc(`${yesterday}_all`).get(),
      adminDb.collection('featureInterestCounts').get()
    ]);

    const ownerOf = (path: string) => path.split('/')[1] ?? '';
    const usage = summarizeUsage(
      usageSnap.docs.map(doc => ({ uid: ownerOf(doc.ref.path), month: doc.id, chatRequests: Number(doc.get('chatRequests') ?? 0) })),
      currentMonthKey(now),
      exclude
    );
    const songs = summarizeSongs(
      songsSnap.docs.map(doc => ({ uid: ownerOf(doc.ref.path), source: doc.get('metadata')?.source ?? null })),
      exclude
    );

    return res.status(200).json({
      generatedAt: now.toISOString(),
      members: summarizeMembers(members, now, exclude),
      usage,
      songs: { ...songs, audio: audioCount.data().count },
      trial: {
        today: Number(trialToday.get('count') ?? 0),
        yesterday: Number(trialYesterday.get('count') ?? 0)
      },
      interest: Object.fromEntries(interestSnap.docs.map(doc => [doc.id, Number(doc.get('count') ?? 0)]))
    });
  } catch (error) {
    if (error instanceof AppError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    logError('admin.metrics_failed', error);
    return res.status(500).json({ error: 'Unexpected server error.' });
  }
}
