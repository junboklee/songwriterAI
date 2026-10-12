import { getDefaultCharacter } from '@/lib/defaultCharacters';

describe('built-in Dayeon persona', () => {
  const dayeon = getDefaultCharacter('1');

  it('exists for the default character id', () => {
    expect(dayeon?.name).toBe('Dayeon');
  });

  it('keeps the crisis-safety rules and Korean hotlines', () => {
    expect(dayeon?.instructions).toMatch(/Safety comes first/);
    expect(dayeon?.instructions).toContain('109');
    expect(dayeon?.instructions).toContain('1577-0199');
  });

  it('is honest about being an AI character', () => {
    expect(dayeon?.instructions).toMatch(/AI character/);
  });
});
