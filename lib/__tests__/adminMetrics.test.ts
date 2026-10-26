import { summarizeMembers, summarizeSongs, summarizeUsage } from '@/lib/adminMetrics';

const now = new Date('2026-10-26T03:00:00Z'); // 12:00 in Seoul
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);
const member = (uid: string, created: number, active: number | null, extra: Partial<{ adult: boolean; verified: boolean }> = {}) => ({
  uid,
  createdAt: daysAgo(created),
  lastActiveAt: active === null ? null : daysAgo(active),
  adultConfirmed: Boolean(extra.adult),
  identityVerified: Boolean(extra.verified)
});

describe('summarizeMembers', () => {
  it('counts members, recent sign-ups and activity without test accounts', () => {
    const summary = summarizeMembers(
      [
        member('a', 0, 0, { adult: true }),
        member('b', 3, 1, { adult: true, verified: true }),
        member('c', 20, 15),
        member('d', 400, null),
        member('smoke', 1, 0, { adult: true })
      ],
      now,
      ['smoke']
    );
    expect(summary).toMatchObject({ total: 4, adultConfirmed: 2, identityVerified: 1, new7: 2, new30: 3, active7: 2 });
    expect(summary.daily).toHaveLength(14);
    expect(summary.daily.at(-1)).toEqual({ date: '2026-10-26', signups: 1 });
    expect(summary.daily.find(day => day.date === '2026-10-23')?.signups).toBe(1);
  });
});

describe('summarizeUsage', () => {
  it('counts this month’s active members and their requests', () => {
    expect(
      summarizeUsage(
        [
          { uid: 'a', month: '2026-10', chatRequests: 12 },
          { uid: 'b', month: '2026-10', chatRequests: 0 },
          { uid: 'c', month: '2026-09', chatRequests: 30 },
          { uid: 'smoke', month: '2026-10', chatRequests: 80 }
        ],
        '2026-10',
        ['smoke']
      )
    ).toEqual({ month: '2026-10', activeUsers: 1, requests: 12 });
  });
});

describe('summarizeSongs', () => {
  it('splits saved lyrics by where they came from', () => {
    expect(
      summarizeSongs([
        { uid: 'a', source: 'auto-from-chat' },
        { uid: 'a', source: 'trial' },
        { uid: 'b', source: null },
        { uid: 'b', source: 'auto-from-chat' }
      ])
    ).toEqual({ total: 4, fromChat: 2, fromTrial: 1, other: 1 });
  });
});
