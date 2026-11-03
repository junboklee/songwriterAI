import type { NextApiRequest, NextApiResponse } from 'next';

import { resetAiStatus } from '@/lib/aiStatus';
import { probeAi } from '@/lib/llm';
import handler from '@/pages/api/ai-status';

jest.mock('@/lib/llm', () => ({ probeAi: jest.fn() }));

const call = async (method = 'GET') => {
  const headers: Record<string, string> = {};
  const res: Partial<NextApiResponse & { body?: unknown; code?: number }> = {};
  res.status = jest.fn(code => {
    res.code = code;
    return res as NextApiResponse;
  });
  res.json = jest.fn(body => {
    res.body = body;
    return res as NextApiResponse;
  });
  res.setHeader = jest.fn((key: string, value: string) => {
    headers[key] = value;
    return res as NextApiResponse;
  }) as unknown as NextApiResponse['setHeader'];
  await handler({ method } as NextApiRequest, res as NextApiResponse);
  return { ...res, headers };
};

describe('/api/ai-status', () => {
  beforeEach(() => {
    resetAiStatus();
    jest.clearAllMocks();
  });

  it('reports the probe result with a short public cache', async () => {
    (probeAi as jest.Mock).mockResolvedValue(false);
    const res = await call();
    expect(res.code).toBe(200);
    expect(res.body).toEqual({ available: false });
    expect(res.headers['Cache-Control']).toBe('public, max-age=30, s-maxage=60');
  });

  it('says available when the check itself breaks', async () => {
    (probeAi as jest.Mock).mockRejectedValue(new Error('boom'));
    expect((await call()).body).toEqual({ available: true });
  });

  it('only answers GET', async () => {
    expect((await call('POST')).code).toBe(405);
    expect(probeAi).not.toHaveBeenCalled();
  });
});
