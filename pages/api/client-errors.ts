import type { NextApiRequest, NextApiResponse } from 'next';

import { AppError } from '@/lib/errors';
import { logError } from '@/lib/logger';
import { enforceRateLimit } from '@/lib/rateLimiter';

const KINDS = new Set(['error', 'unhandledrejection', 'react']);

const clip = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : null);

// Receives browser errors (lib/errorReporting.ts) and writes them to the server log, where they
// show up in Cloud Logging next to server errors. No auth: errors can happen before login.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body ?? {}) as Record<string, unknown>;
  const message = clip(body.message, 500);
  const kind = typeof body.kind === 'string' && KINDS.has(body.kind) ? body.kind : null;
  if (!message || !kind) {
    return res.status(400).json({ error: 'message and kind are required.' });
  }

  try {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    await enforceRateLimit(`client-errors:${ip}`);
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 429) {
      return res.status(429).end();
    }
    throw error;
  }

  logError('client.error', null, {
    kind,
    message,
    stack: clip(body.stack, 2000),
    // Path only: query strings can carry ids (threadId, characterId).
    path: clip(body.path, 200),
    userAgent: clip(req.headers['user-agent'], 200)
  });

  return res.status(204).end();
}
