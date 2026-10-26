// Who may make AI songs, and the free allowance (one 30-second preview per verified person).
//  - admins and MUSIC_TESTER_UIDS: always, without limits (testing)
//  - everyone else: only once SONG_PUBLIC=true, after identity verification (lib/identity.ts), and
//    within FREE_SONG_CLIPS free previews counted per person (identityKeys/{key}), not per account.
// Full songs need paid credits, which do not exist yet.
import { isAdmin } from '@/lib/adminAuth';
import { AppError } from '@/lib/errors';
import { adminDb } from '@/lib/firebaseAdmin';
import type { SongLength } from '@/lib/music/lyria';
import type { AuthenticatedUser } from '@/lib/serverAuth';

export type SongAccess = 'unlimited' | 'closed' | 'needsIdentity' | 'free' | 'freeUsed';

const FREE_SONG_CLIPS = Number(process.env.FREE_SONG_CLIPS ?? 1);

const testerUids = () =>
  (process.env.MUSIC_TESTER_UIDS ?? '')
    .split(',')
    .map(uid => uid.trim())
    .filter(Boolean);

const keyRef = (identityKey: string) => adminDb.collection('identityKeys').doc(identityKey);

export async function songAccess(user: AuthenticatedUser): Promise<SongAccess> {
  if (isAdmin(user) || testerUids().includes(user.uid)) {
    return 'unlimited';
  }
  if (process.env.SONG_PUBLIC !== 'true') {
    return 'closed';
  }
  if (!user.identityKey) {
    return 'needsIdentity';
  }
  const used = Number((await keyRef(user.identityKey).get()).get('freeClipsUsed') ?? 0);
  return used < FREE_SONG_CLIPS ? 'free' : 'freeUsed';
}

const DENIED: Record<Exclude<SongAccess, 'unlimited' | 'free'>, { message: string; code: string }> = {
  closed: { message: '노래 만들기는 아직 준비 중이에요.', code: 'FORBIDDEN' },
  needsIdentity: { message: '노래를 만들려면 먼저 본인인증이 필요해요.', code: 'IDENTITY_REQUIRED' },
  freeUsed: { message: '무료 미리듣기를 모두 사용했어요. 더 만들기는 곧 열릴 예정이에요.', code: 'FREE_SONGS_USED' }
};

// Checks access for one generation and, for a free preview, reserves it. Returns a function that
// gives the reservation back if the generation then fails.
export async function reserveSong(user: AuthenticatedUser, length: SongLength): Promise<() => Promise<void>> {
  const access = await songAccess(user);
  if (access === 'unlimited') {
    return async () => undefined;
  }
  if (access !== 'free') {
    const denied = DENIED[access];
    throw new AppError(denied.message, { statusCode: 403, code: denied.code });
  }
  if (length !== 'clip') {
    throw new AppError('전체 곡은 유료 기능으로 준비 중이에요. 30초 미리듣기를 먼저 들어 보세요.', {
      statusCode: 403,
      code: 'PAID_ONLY'
    });
  }
  const ref = keyRef(user.identityKey as string);
  await adminDb.runTransaction(async tx => {
    const used = Number((await tx.get(ref)).get('freeClipsUsed') ?? 0);
    if (used >= FREE_SONG_CLIPS) {
      throw new AppError(DENIED.freeUsed.message, { statusCode: 403, code: DENIED.freeUsed.code });
    }
    tx.set(ref, { freeClipsUsed: used + 1 }, { merge: true });
  });
  return async () => {
    await adminDb.runTransaction(async tx => {
      const used = Number((await tx.get(ref)).get('freeClipsUsed') ?? 0);
      tx.set(ref, { freeClipsUsed: Math.max(0, used - 1) }, { merge: true });
    });
  };
}
