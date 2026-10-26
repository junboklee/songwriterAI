// Aggregates for the admin metrics page (/admin/metrics), computed from data the service already
// keeps: Firebase Auth accounts, monthly usage counters, songs, generated audio, trial counters and
// feature-interest counts. Only totals leave the server, never per-user data.
import { formatYmd, todayInSeoul } from '@/lib/age';

const DAY_MS = 86_400_000;
export const DAILY_WINDOW = 14;

export type MemberRow = {
  uid: string;
  createdAt: Date | null;
  lastActiveAt: Date | null;
  adultConfirmed: boolean;
  identityVerified: boolean;
};

export const seoulDate = (date: Date) => formatYmd(todayInSeoul(date));

export function summarizeMembers(rows: MemberRow[], now = new Date(), excludeUids: string[] = []) {
  const members = rows.filter(row => !excludeUids.includes(row.uid));
  const since = (days: number, date: Date | null) => Boolean(date && now.getTime() - date.getTime() <= days * DAY_MS);
  const daily = Array.from({ length: DAILY_WINDOW }, (_, index) => {
    const date = seoulDate(new Date(now.getTime() - (DAILY_WINDOW - 1 - index) * DAY_MS));
    return { date, signups: members.filter(row => row.createdAt && seoulDate(row.createdAt) === date).length };
  });
  return {
    total: members.length,
    adultConfirmed: members.filter(row => row.adultConfirmed).length,
    identityVerified: members.filter(row => row.identityVerified).length,
    new7: members.filter(row => since(7, row.createdAt)).length,
    new30: members.filter(row => since(30, row.createdAt)).length,
    active7: members.filter(row => since(7, row.lastActiveAt)).length,
    daily
  };
}

export function summarizeUsage(docs: Array<{ uid: string; month: string; chatRequests: number }>, month: string, excludeUids: string[] = []) {
  const current = docs.filter(doc => doc.month === month && doc.chatRequests > 0 && !excludeUids.includes(doc.uid));
  return {
    month,
    activeUsers: current.length,
    requests: current.reduce((sum, doc) => sum + doc.chatRequests, 0)
  };
}

export function summarizeSongs(songs: Array<{ uid: string; source: string | null }>, excludeUids: string[] = []) {
  const counted = songs.filter(song => !excludeUids.includes(song.uid));
  const bySource = (source: string) => counted.filter(song => song.source === source).length;
  return {
    total: counted.length,
    fromChat: bySource('auto-from-chat'),
    fromTrial: bySource('trial'),
    other: counted.length - bySource('auto-from-chat') - bySource('trial')
  };
}
