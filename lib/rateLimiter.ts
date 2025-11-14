import { RateLimitError } from '@/lib/errors';
import { translate } from '@/lib/i18n';

type RateLimitEntry = {
  count: number;
  windowStart: number;
};

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const WINDOW_MS = parsePositiveInt(process.env.CHAT_RATE_LIMIT_WINDOW_MS, 60_000);
const MAX_REQUESTS = parsePositiveInt(process.env.CHAT_RATE_LIMIT_MAX_REQUESTS, 20);

type RateLimitGlobal = typeof globalThis & {
  __songwriterRateLimitStore?: Map<string, RateLimitEntry>;
  __songwriterRateLimitLastCleanup?: number;
};

const globalContext = globalThis as RateLimitGlobal;

if (!globalContext.__songwriterRateLimitStore) {
  globalContext.__songwriterRateLimitStore = new Map();
}

const store = globalContext.__songwriterRateLimitStore!;

const shouldCleanup = (now: number) => {
  const lastCleanup = globalContext.__songwriterRateLimitLastCleanup ?? 0;
  return now - lastCleanup > WINDOW_MS;
};

const cleanupExpiredEntries = (now: number) => {
  for (const [key, entry] of store.entries()) {
    if (now - entry.windowStart > WINDOW_MS) {
      store.delete(key);
    }
  }
  globalContext.__songwriterRateLimitLastCleanup = now;
};

export function enforceRateLimit(key: string) {
  const now = Date.now();

  if (shouldCleanup(now)) {
    cleanupExpiredEntries(now);
  }

  const entry = store.get(key);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(key, { count: 1, windowStart: now });
    return;
  }

  if (entry.count >= MAX_REQUESTS) {
    throw new RateLimitError(translate('rateLimiter.exceeded'));
  }

  entry.count += 1;
}
