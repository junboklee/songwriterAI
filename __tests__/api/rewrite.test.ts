import type { NextApiRequest, NextApiResponse } from 'next';

import { completeText } from '@/lib/llm';
import { enforceRateLimit } from '@/lib/rateLimiter';
import { requireUser } from '@/lib/serverAuth';
import { assertWithinMonthlyQuota, recordChatUsage } from '@/lib/usage';
import { AppError } from '@/lib/errors';
import handler from '@/pages/api/lyrics/rewrite';

jest.mock('@/lib/llm', () => ({ completeText: jest.fn() }));
jest.mock('@/lib/rateLimiter', () => ({ enforceRateLimit: jest.fn() }));
jest.mock('@/lib/serverAuth', () => ({ requireUser: jest.fn() }));
jest.mock('@/lib/usage', () => ({ assertWithinMonthlyQuota: jest.fn(), recordChatUsage: jest.fn(async () => undefined) }));
jest.mock('@/lib/logger', () => ({ logError: jest.fn() }));

const completeTextMock = completeText as jest.MockedFunction<typeof completeText>;

const createResponse = () => {
  const res: Partial<NextApiResponse & { body?: unknown }> = {};
  res.status = jest.fn(() => res as NextApiResponse);
  res.json = jest.fn(payload => {
    res.body = payload;
    return res as NextApiResponse;
  });
  res.setHeader = jest.fn();
  return res as NextApiResponse & { body?: unknown };
};

const request = (body: Record<string, unknown>) => ({ method: 'POST', headers: {}, body } as unknown as NextApiRequest);

describe('POST /api/lyrics/rewrite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requireUser as jest.Mock).mockResolvedValue({ uid: 'user-1' });
    completeTextMock.mockImplementation(async (_instructions, _input, onUsage) => {
      onUsage?.({ inputTokens: 50, outputTokens: 10 });
      return '<rewrite>빗속에 너를 불러</rewrite>';
    });
  });

  it('returns the parsed replacement and records usage', async () => {
    const res = createResponse();
    await handler(request({ lyrics: '[Chorus]\n너를 불러', selection: '너를 불러', instruction: '더 슬프게' }), res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toEqual({ replacement: '빗속에 너를 불러' });
    expect(enforceRateLimit).toHaveBeenCalledWith('user-1');
    expect(recordChatUsage).toHaveBeenCalledWith('user-1', { inputTokens: 50, outputTokens: 10 });
  });

  it('validates required fields before calling the model', async () => {
    const res = createResponse();
    await handler(request({ lyrics: 'x', selection: '', instruction: '더 슬프게' }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(completeTextMock).not.toHaveBeenCalled();
  });

  it('respects the monthly quota', async () => {
    (assertWithinMonthlyQuota as jest.Mock).mockRejectedValueOnce(
      new AppError('limit', { statusCode: 429, code: 'MONTHLY_QUOTA_EXCEEDED' })
    );
    const res = createResponse();
    await handler(request({ lyrics: 'x', selection: 'x', instruction: 'y' }), res);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(completeTextMock).not.toHaveBeenCalled();
  });
});
