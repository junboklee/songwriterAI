// No-signup trial: a visitor who confirms they are 만 19세 or older may send Dayeon a few messages
// before creating an account. Nothing they type is stored; only a daily counter keyed by a keyed
// hash of their IP (never the IP itself), plus a global daily cap that bounds the AI cost.
import { createHmac } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';

import { todayInSeoul, formatYmd } from '@/lib/age';
import { AppError } from '@/lib/errors';
import { adminDb } from '@/lib/firebaseAdmin';
import type { ChatTurn } from '@/lib/llm';
import { logWarn } from '@/lib/logger';

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

export const TRIAL_MESSAGES_PER_DAY = parsePositiveInt(process.env.TRIAL_MESSAGES_PER_DAY, 3);
const TRIAL_GLOBAL_DAILY_LIMIT = parsePositiveInt(process.env.TRIAL_GLOBAL_DAILY_LIMIT, 300);
export const TRIAL_MAX_MESSAGE = 1000;
const TRIAL_MAX_HISTORY = 6;
const TRIAL_MAX_HISTORY_CHARS = 8000;
const COLLECTION = '_trialUsage';

export class TrialLimitError extends AppError {
  constructor(message: string, code: 'TRIAL_LIMIT' | 'TRIAL_CLOSED') {
    super(message, { statusCode: 429, code });
  }
}

// Keyed with a server secret and the date, so stored keys cannot be reversed or linked across days.
export function visitorKey(ip: string, date: string) {
  const secret = process.env.TRIAL_KEY_SECRET ?? process.env.FIREBASE_PRIVATE_KEY ?? 'novasinger-trial';
  return createHmac('sha256', secret).update(`${date}|${ip}`).digest('hex').slice(0, 32);
}

// Counts one trial message for this visitor and for the day, or throws when a limit is reached.
export async function consumeTrialMessage(ip: string, now = new Date()) {
  const date = formatYmd(todayInSeoul(now));
  const visitorRef = adminDb.collection(COLLECTION).doc(`${date}_${visitorKey(ip, date)}`);
  const globalRef = adminDb.collection(COLLECTION).doc(`${date}_all`);
  // Kept two days so the doc outlives the Korean day it counts, then removed by cleanup.
  const expiresAt = Timestamp.fromMillis(now.getTime() + 2 * 86_400_000);

  return adminDb.runTransaction(async tx => {
    const [visitor, global] = await Promise.all([tx.get(visitorRef), tx.get(globalRef)]);
    const used = Number(visitor.get('count') ?? 0);
    const usedToday = Number(global.get('count') ?? 0);
    if (used >= TRIAL_MESSAGES_PER_DAY) {
      throw new TrialLimitError('오늘 체험은 여기까지예요. 가입하면 이어서 쓸 수 있어요.', 'TRIAL_LIMIT');
    }
    if (usedToday >= TRIAL_GLOBAL_DAILY_LIMIT) {
      throw new TrialLimitError('오늘 체험 인원이 다 찼어요. 가입하면 바로 이용할 수 있어요.', 'TRIAL_CLOSED');
    }
    tx.set(visitorRef, { count: used + 1, expiresAt });
    tx.set(globalRef, { count: usedToday + 1, expiresAt });
    return { remaining: TRIAL_MESSAGES_PER_DAY - used - 1 };
  });
}

// Removes expired counters now and then (no Firestore TTL policy is configured).
export async function cleanupTrialUsage(now = new Date()) {
  try {
    const expired = await adminDb
      .collection(COLLECTION)
      .where('expiresAt', '<', Timestamp.fromDate(now))
      .limit(100)
      .get();
    await Promise.all(expired.docs.map(doc => doc.ref.delete()));
  } catch (error) {
    logWarn('trial.cleanup_failed', { message: (error as Error)?.message });
  }
}

// The trial history comes from the browser, so it is trimmed to a few short, well-formed turns.
export function sanitizeTrialHistory(value: unknown): ChatTurn[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const turns = value
    .filter(
      (item): item is ChatTurn =>
        Boolean(item) &&
        (item.role === 'user' || item.role === 'assistant') &&
        typeof item.content === 'string' &&
        item.content.trim().length > 0
    )
    .slice(-TRIAL_MAX_HISTORY)
    .map(item => ({ role: item.role, content: item.content.slice(0, 4000) }));
  let total = 0;
  const kept: ChatTurn[] = [];
  for (const turn of [...turns].reverse()) {
    total += turn.content.length;
    if (total > TRIAL_MAX_HISTORY_CHARS) {
      break;
    }
    kept.unshift(turn);
  }
  return kept;
}
