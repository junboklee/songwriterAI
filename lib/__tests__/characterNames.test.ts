import { isDayeonAssistant } from '@/lib/assistantBubbleColors';
import { DEFAULT_CHARACTER_NAMES, displayCharacterName } from '@/lib/defaultCharacterNames';

describe('the built-in character name in Korean', () => {
  it('shows 다연, also for songs saved under the old name', () => {
    expect(DEFAULT_CHARACTER_NAMES['1']).toBe('다연');
    expect(displayCharacterName('Dayeon')).toBe('다연');
    expect(displayCharacterName('루나')).toBe('루나');
  });

  it('still recognises the character by either name', () => {
    expect(isDayeonAssistant(null, '다연')).toBe(true);
    expect(isDayeonAssistant(null, 'Dayeon')).toBe(true);
    expect(isDayeonAssistant('2', '루나')).toBe(false);
  });
});
