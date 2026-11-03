import OpenAI from 'openai';

import { aiAvailable, resetAiStatus } from '@/lib/aiStatus';
import { AppError } from '@/lib/errors';
import { AiUnavailableError, asProviderError, generateReply, probeAi, streamReply } from '@/lib/llm';
import { logError, logWarn } from '@/lib/logger';

jest.mock('@/lib/logger', () => ({ logError: jest.fn(), logInfo: jest.fn(), logWarn: jest.fn() }));

const createMock = (OpenAI as unknown as { __mocks: { responsesCreateMock: jest.Mock } }).__mocks.responsesCreateMock;

const quotaError = Object.assign(new Error('429 You have no credits remaining. Add credits to continue using the API.'), {
  status: 429
});

describe('asProviderError', () => {
  beforeEach(() => jest.clearAllMocks());

  it('turns a used-up quota into a Korean 503 and logs the original error', () => {
    const mapped = asProviderError(quotaError);
    expect(mapped).toBeInstanceOf(AiUnavailableError);
    expect(mapped).toMatchObject({ statusCode: 503, code: 'AI_UNAVAILABLE' });
    expect((mapped as Error).message).toMatch(/잠시 후 다시 시도/);
    expect(logError).toHaveBeenCalledWith('llm.unavailable', quotaError, { reason: 'quota' });
  });

  it('recognises the quota message even without a status (stream errors)', () => {
    expect(asProviderError(new Error('You have no credits remaining.'))).toBeInstanceOf(AiUnavailableError);
    expect(asProviderError(Object.assign(new Error('quota'), { code: 'insufficient_quota' }))).toBeInstanceOf(
      AiUnavailableError
    );
  });

  it('treats other 429s as rate limiting', () => {
    expect(asProviderError(Object.assign(new Error('Rate limit reached'), { status: 429 }))).toBeInstanceOf(
      AiUnavailableError
    );
    expect(logError).toHaveBeenCalledWith('llm.unavailable', expect.any(Error), { reason: 'rate_limit' });
  });

  it('leaves other errors alone', () => {
    const other = new Error('socket hang up');
    expect(asProviderError(other)).toBe(other);
    const appError = new AppError('bad', { statusCode: 400 });
    expect(asProviderError(appError)).toBe(appError);
    expect(logError).not.toHaveBeenCalled();
  });
});

describe('model calls', () => {
  beforeAll(() => {
    process.env.OPENAI_API_KEY = 'test';
  });
  beforeEach(() => createMock.mockReset());

  it('maps a refused request', async () => {
    createMock.mockRejectedValue(quotaError);
    await expect(generateReply('persona', [{ role: 'user', content: '안녕' }])).rejects.toBeInstanceOf(
      AiUnavailableError
    );
  });

  it('maps a quota error raised while reading the stream', async () => {
    createMock.mockResolvedValue({
      // eslint-disable-next-line require-yield
      async *[Symbol.asyncIterator]() {
        throw new Error('You have no credits remaining.');
      }
    });
    const read = async () => {
      for await (const delta of streamReply('persona', [{ role: 'user', content: '안녕' }])) {
        void delta;
      }
    };
    await expect(read()).rejects.toBeInstanceOf(AiUnavailableError);
  });

  it('remembers whether real requests got through', async () => {
    const probe = jest.fn().mockResolvedValue(true);
    resetAiStatus();
    createMock.mockRejectedValue(quotaError);
    await generateReply('persona', [{ role: 'user', content: '안녕' }]).catch(() => null);
    expect(await aiAvailable(probe)).toBe(false);

    createMock.mockResolvedValue({ output_text: '안녕!', usage: null });
    await generateReply('persona', [{ role: 'user', content: '안녕' }]);
    expect(await aiAvailable(probe)).toBe(true);
    expect(probe).not.toHaveBeenCalled();
  });

  it('probes with a tiny request and only reports used-up credits as unavailable', async () => {
    (logError as jest.Mock).mockClear();
    createMock.mockResolvedValue({ output_text: 'ok' });
    expect(await probeAi()).toBe(true);
    expect(createMock.mock.calls[0][0]).toMatchObject({ input: 'ok', store: false });

    createMock.mockRejectedValue(quotaError);
    expect(await probeAi()).toBe(false);
    expect(logWarn).toHaveBeenCalledWith('llm.probe_failed', { quota: true });
    expect(logError).not.toHaveBeenCalled();

    createMock.mockRejectedValue(new Error('socket hang up'));
    expect(await probeAi()).toBe(true);
  });
});
