import { ageGateState, ageOn, isAdult, parseBirthDate, todayInSeoul } from '@/lib/age';

const today = { year: 2026, month: 10, day: 23 };

describe('parseBirthDate', () => {
  it.each(['19950315', '1995-03-15', '1995.03.15', ' 1995 03 15 '])('accepts %s', input => {
    expect(parseBirthDate(input, today)).toEqual({ year: 1995, month: 3, day: 15 });
  });

  it.each(['1995315', '19950231', '20261024', '18991231', 'abcdefgh', ''])('rejects %s', input => {
    expect(parseBirthDate(input, today)).toBeNull();
  });
});

describe('ageOn / isAdult (만 나이)', () => {
  it('counts a year only once the birthday has passed', () => {
    expect(ageOn({ year: 2007, month: 10, day: 23 }, today)).toBe(19);
    expect(ageOn({ year: 2007, month: 10, day: 24 }, today)).toBe(18);
    expect(isAdult({ year: 2007, month: 10, day: 23 }, today)).toBe(true);
    expect(isAdult({ year: 2007, month: 10, day: 24 }, today)).toBe(false);
  });

  it('treats someone born on 29 February as older from 1 March in common years', () => {
    const leapling = { year: 2008, month: 2, day: 29 };
    expect(ageOn(leapling, { year: 2027, month: 2, day: 28 })).toBe(18);
    expect(ageOn(leapling, { year: 2027, month: 3, day: 1 })).toBe(19);
  });
});

describe('todayInSeoul', () => {
  it('uses the Korean date even when UTC is still on the previous day', () => {
    expect(todayInSeoul(new Date('2026-10-22T16:30:00Z'))).toEqual({ year: 2026, month: 10, day: 23 });
  });
});

describe('ageGateState', () => {
  const before = new Date('2026-10-01T00:00:00Z');
  const after = new Date('2026-10-23T03:00:00Z');

  it('lets confirmed members through', () => {
    expect(ageGateState({ confirmed: true, createdAt: after })).toBe('confirmed');
  });

  it('gives members who joined before the policy until the deadline', () => {
    expect(ageGateState({ confirmed: false, createdAt: before, now: new Date('2026-11-22T14:00:00Z') })).toBe('grace');
    expect(ageGateState({ confirmed: false, createdAt: before, now: new Date('2026-11-22T15:00:00Z') })).toBe('required');
  });

  it('requires new and unknown accounts to confirm', () => {
    expect(ageGateState({ confirmed: false, createdAt: after, now: after })).toBe('required');
    expect(ageGateState({ confirmed: false, createdAt: null, now: after })).toBe('required');
  });
});
