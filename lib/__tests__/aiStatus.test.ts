import { aiAvailable, recordAiStatus, resetAiStatus } from '@/lib/aiStatus';

describe('aiAvailable', () => {
  beforeEach(() => resetAiStatus());

  it('probes once when nothing is known and shares the answer with requests in flight', async () => {
    const probe = jest.fn().mockResolvedValue(false);
    const answers = await Promise.all([aiAvailable(probe), aiAvailable(probe), aiAvailable(probe)]);
    expect(answers).toEqual([false, false, false]);
    expect(await aiAvailable(probe)).toBe(false);
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('trusts a recent real request and probes again after ten minutes', async () => {
    const probe = jest.fn().mockResolvedValue(true);
    const now = Date.now();
    recordAiStatus(false, now);
    expect(await aiAvailable(probe, now + 9 * 60_000)).toBe(false);
    expect(probe).not.toHaveBeenCalled();

    expect(await aiAvailable(probe, now + 11 * 60_000)).toBe(true);
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it('lets a failed probe be retried', async () => {
    const probe = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(true);
    await expect(aiAvailable(probe)).rejects.toThrow('boom');
    expect(await aiAvailable(probe)).toBe(true);
  });
});
