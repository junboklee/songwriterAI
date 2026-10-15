import { FieldValue, Timestamp } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebaseAdmin';
import { AppError } from '@/lib/errors';

// Monthly AI usage per user: users/{uid}/usage/{YYYY-MM} (month boundaries in KST).
// Limits come from env so plans can be tuned without a deploy of new code; 0/unset = unlimited.

export type Plan = 'free' | 'studio';

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

const PLAN_LIMIT_ENV: Record<Plan, string> = {
  free: 'CHAT_MONTHLY_LIMIT_FREE',
  studio: 'CHAT_MONTHLY_LIMIT_STUDIO'
};

export function currentMonthKey(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit'
  }).formatToParts(now);
  const year = parts.find(part => part.type === 'year')?.value;
  const month = parts.find(part => part.type === 'month')?.value;
  return `${year}-${month}`;
}

export function resolvePlan(value: unknown): Plan {
  return value === 'studio' ? 'studio' : 'free';
}

export function monthlyLimitFor(plan: Plan): number | null {
  const parsed = Number(process.env[PLAN_LIMIT_ENV[plan]]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.trunc(parsed) : null;
}

export async function getMonthlyUsage(userId: string) {
  const userRef = adminDb.collection('users').doc(userId);
  const month = currentMonthKey();
  const [userSnap, usageSnap] = await Promise.all([
    userRef.get(),
    userRef.collection('usage').doc(month).get()
  ]);

  const plan = resolvePlan(userSnap.get('plan'));
  const usage = usageSnap.exists ? usageSnap.data() ?? {} : {};

  return {
    month,
    plan,
    limit: monthlyLimitFor(plan),
    chatRequests: typeof usage.chatRequests === 'number' ? usage.chatRequests : 0,
    inputTokens: typeof usage.inputTokens === 'number' ? usage.inputTokens : 0,
    outputTokens: typeof usage.outputTokens === 'number' ? usage.outputTokens : 0
  };
}

export type QuotaStatus = {
  used: number;
  limit: number | null;
};

// Throws when the monthly cap is reached; otherwise returns usage *including* the request about
// to be made, so responses can tell the user how many requests are left.
export async function assertWithinMonthlyQuota(userId: string): Promise<QuotaStatus> {
  const usage = await getMonthlyUsage(userId);
  if (usage.limit !== null && usage.chatRequests >= usage.limit) {
    throw new AppError(
      `이번 달 AI 요청 한도(${usage.limit}회)를 모두 사용했습니다. 다음 달 1일에 초기화됩니다.`,
      { statusCode: 429, code: 'MONTHLY_QUOTA_EXCEEDED' }
    );
  }
  return { used: usage.chatRequests + 1, limit: usage.limit };
}

export async function recordChatUsage(userId: string, tokens: TokenUsage | null) {
  await adminDb
    .collection('users')
    .doc(userId)
    .collection('usage')
    .doc(currentMonthKey())
    .set(
      {
        chatRequests: FieldValue.increment(1),
        inputTokens: FieldValue.increment(tokens?.inputTokens ?? 0),
        outputTokens: FieldValue.increment(tokens?.outputTokens ?? 0),
        updatedAt: Timestamp.now()
      },
      { merge: true }
    );
}
