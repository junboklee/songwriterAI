import type { NextApiRequest, NextApiResponse } from 'next';

import { logError } from '@/lib/logger';
import { enforceRateLimit } from '@/lib/rateLimiter';
import { RateLimitError } from '@/lib/errors';
import handler from '@/pages/api/client-errors';

jest.mock('@/lib/logger', () => ({ logError: jest.fn() }));
jest.mock('@/lib/rateLimiter', () => ({ enforceRateLimit: jest.fn() }));

const createResponse = () => {
  const res: Partial<NextApiResponse> = {};
  res.status = jest.fn(() => res as NextApiResponse);
  res.json = jest.fn(() => res as NextApiResponse);
  res.end = jest.fn(() => res as NextApiResponse);
  res.setHeader = jest.fn();
  return res as NextApiResponse;
};

const request = (body: unknown) =>
  ({ method: 'POST', body, headers: { 'x-forwarded-for': '1.2.3.4, 10.0.0.1', 'user-agent': 'jest' }, socket: {} } as unknown as NextApiRequest);

describe('POST /api/client-errors', () => {
  beforeEach(() => jest.clearAllMocks());

  it('logs a clipped error report and rate limits by client IP', async () => {
    const res = createResponse();
    await handler(request({ kind: 'error', message: 'x'.repeat(900), path: '/chat', stack: 'at a' }), res);

    expect(enforceRateLimit).toHaveBeenCalledWith('client-errors:1.2.3.4');
    expect(res.status).toHaveBeenCalledWith(204);
    const meta = (logError as jest.Mock).mock.calls[0][2];
    expect(meta.message).toHaveLength(500);
    expect(meta).toMatchObject({ kind: 'error', path: '/chat', userAgent: 'jest' });
  });

  it('rejects malformed reports', async () => {
    const res = createResponse();
    await handler(request({ kind: 'nonsense', message: 'x' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(logError).not.toHaveBeenCalled();
  });

  it('drops reports over the rate limit without logging', async () => {
    (enforceRateLimit as jest.Mock).mockRejectedValueOnce(new RateLimitError('slow down'));
    const res = createResponse();
    await handler(request({ kind: 'error', message: 'x' }), res);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(logError).not.toHaveBeenCalled();
  });
});
