// Adult-only policy: members must be 만 19세 (Korean civil-law majority, counted from the birth date).
// Shared by the sign-up form, the age gate and the server, so all three agree on who may use the service.

export const ADULT_AGE = 19;

// New sign-ups must confirm their age from this date. Members who joined earlier get until
// EXISTING_MEMBER_DEADLINE (30 days' notice, as terms 제3조 requires for unfavourable changes).
export const AGE_POLICY_START = '2026-10-23';
export const EXISTING_MEMBER_DEADLINE = '2026-11-23';

export type YMD = { year: number; month: number; day: number };

const pad = (value: number) => String(value).padStart(2, '0');
export const formatYmd = ({ year, month, day }: YMD) => `${year}-${pad(month)}-${pad(day)}`;

// Today's date in Korea, whatever the device or server time zone is.
export function todayInSeoul(now = new Date()): YMD {
  const [year, month, day] = now
    .toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' })
    .split('-')
    .map(Number);
  return { year, month, day };
}

// Accepts "19950315", "1995-03-15" or "1995.03.15". Returns null for impossible or future dates.
export function parseBirthDate(input: string, today: YMD = todayInSeoul()): YMD | null {
  const digits = input.replace(/[\s.\-/]/g, '');
  if (!/^\d{8}$/.test(digits)) {
    return null;
  }
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1900 || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  if (formatYmd({ year, month, day }) > formatYmd(today)) {
    return null;
  }
  return { year, month, day };
}

// 만 나이: full years since birth. Someone born on 29 February gets older on 1 March in common years.
export function ageOn(birth: YMD, today: YMD) {
  const hadBirthday = today.month > birth.month || (today.month === birth.month && today.day >= birth.day);
  return today.year - birth.year - (hadBirthday ? 0 : 1);
}

export const isAdult = (birth: YMD, today: YMD = todayInSeoul()) => ageOn(birth, today) >= ADULT_AGE;

export type AgeGateState = 'confirmed' | 'grace' | 'required';

// `createdAt` is when the account was made. Older accounts may keep using the service unconfirmed
// until the deadline, and are only reminded meanwhile.
export function ageGateState({
  confirmed,
  createdAt,
  now = new Date()
}: {
  confirmed: boolean;
  createdAt: Date | null;
  now?: Date;
}): AgeGateState {
  if (confirmed) {
    return 'confirmed';
  }
  const today = formatYmd(todayInSeoul(now));
  const joined = createdAt ? formatYmd(todayInSeoul(createdAt)) : null;
  return joined !== null && joined < AGE_POLICY_START && today < EXISTING_MEMBER_DEADLINE ? 'grace' : 'required';
}
