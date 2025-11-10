import { RateLimitError } from '@/lib/errors';
import { translate } from '@/lib/i18n';

type RateLimitEntry = {
  count: number;
  windowStart: number;
};

const WINDOW_MS = Number(process.env.CHAT_RATE_LIMIT_WINDOW_MS ?? 60_000);
const MAX_REQUESTS = Number(process.env.CHAT_RATE_LIMIT_MAX_REQUESTS ?? 20);

const store = new Map<string, RateLimitEntry>();

export function enforceRateLimit(key: string) {
  const now = Date.now();
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
