import { Timestamp } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebaseAdmin';
import { RateLimitError } from '@/lib/errors';
import { translate } from '@/lib/i18n';
import { logWarn } from '@/lib/logger';

type RateLimitEntry = {
  count?: number;
  windowStart?: number;
};

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const WINDOW_MS = parsePositiveInt(process.env.CHAT_RATE_LIMIT_WINDOW_MS, 60_000);
const MAX_REQUESTS = parsePositiveInt(process.env.CHAT_RATE_LIMIT_MAX_REQUESTS, 20);
const RATE_LIMIT_COLLECTION = '_rateLimitWindows';
const MAX_DOC_ID_LENGTH = 150;
const CLEANUP_INTERVAL_MS = Math.max(WINDOW_MS, 60_000);

let cleanupInFlight: Promise<void> | null = null;
let lastCleanupAt = 0;

const sanitizeKey = (key: string) => {
  const normalized = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return normalized.slice(0, MAX_DOC_ID_LENGTH) || 'default';
};

const scheduleCleanup = (now: number) => {
  if (cleanupInFlight || now - lastCleanupAt < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanupAt = now;
  cleanupInFlight = (async () => {
    try {
      const snapshot = await adminDb
        .collection(RATE_LIMIT_COLLECTION)
        .where('expiresAt', '<=', Timestamp.fromMillis(now))
        .limit(200)
        .get();

      if (!snapshot.empty) {
        const batch = adminDb.batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }
    } catch (error) {
      logWarn('rateLimit.cleanup_failed', {
        message: error instanceof Error ? error.message : String(error)
      });
    } finally {
      cleanupInFlight = null;
    }
  })();
};

export async function enforceRateLimit(key: string) {
  const now = Date.now();
  scheduleCleanup(now);
  const docRef = adminDb.collection(RATE_LIMIT_COLLECTION).doc(sanitizeKey(key));

  await adminDb.runTransaction(async tx => {
    const snapshot = await tx.get(docRef);
    const data = snapshot.exists ? (snapshot.data() as RateLimitEntry) : {};

    let windowStart = typeof data.windowStart === 'number' ? data.windowStart : now;
    let requestCount = typeof data.count === 'number' ? data.count : 0;

    if (now - windowStart >= WINDOW_MS) {
      windowStart = now;
      requestCount = 0;
    }

    if (requestCount >= MAX_REQUESTS) {
      throw new RateLimitError(translate('rateLimiter.exceeded'));
    }

    tx.set(
      docRef,
      {
        count: requestCount + 1,
        windowStart,
        expiresAt: Timestamp.fromMillis(windowStart + WINDOW_MS * 2)
      },
      { merge: true }
    );
  });
}
