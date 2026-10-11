import { currentMonthKey, monthlyLimitFor, resolvePlan } from '@/lib/usage';

jest.mock('@/lib/firebaseAdmin', () => ({ adminDb: {} }));

describe('usage helpers', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses Korean time for month boundaries', () => {
    // 2026-01-31 16:30 UTC is already February 1st in Seoul.
    expect(currentMonthKey(new Date('2026-01-31T16:30:00Z'))).toBe('2026-02');
    expect(currentMonthKey(new Date('2026-01-31T14:00:00Z'))).toBe('2026-01');
  });

  it('treats unknown plans as free', () => {
    expect(resolvePlan('studio')).toBe('studio');
    expect(resolvePlan('admin')).toBe('free');
    expect(resolvePlan(undefined)).toBe('free');
  });

  it('reads limits from env and treats unset or zero as unlimited', () => {
    delete process.env.CHAT_MONTHLY_LIMIT_FREE;
    expect(monthlyLimitFor('free')).toBeNull();

    process.env.CHAT_MONTHLY_LIMIT_FREE = '0';
    expect(monthlyLimitFor('free')).toBeNull();

    process.env.CHAT_MONTHLY_LIMIT_FREE = '50';
    expect(monthlyLimitFor('free')).toBe(50);
  });
});
