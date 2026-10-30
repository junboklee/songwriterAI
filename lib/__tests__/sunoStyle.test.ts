import { getLyricsTopic } from '@/lib/lyricsTopics';
import { buildStylePrompt, EMPTY_STYLE, STYLE_FIELDS, STYLE_PRESETS, toggleStyle } from '@/lib/sunoStyle';

describe('suno style builder', () => {
  it('joins tags in field order and appends cleaned extra tags', () => {
    const choice = { ...EMPTY_STYLE, instruments: ['piano'], genre: ['trot'], mood: ['warm', 'bright'] };
    expect(buildStylePrompt(choice, ' rainy night,, reverb ,')).toBe('trot, warm, bright, piano, rainy night, reverb');
    expect(buildStylePrompt(EMPTY_STYLE)).toBe('');
  });

  it('toggles options and keeps the newest picks when a field is full', () => {
    let choice = toggleStyle(EMPTY_STYLE, 'genre', 'rock');
    choice = toggleStyle(choice, 'genre', 'jazz');
    expect(choice.genre).toEqual(['jazz']);
    choice = toggleStyle(choice, 'genre', 'jazz');
    expect(choice.genre).toEqual([]);

    ['piano', 'drums', 'bass', 'synth'].forEach(tag => {
      choice = toggleStyle(choice, 'instruments', tag);
    });
    expect(choice.instruments).toEqual(['drums', 'bass', 'synth']);
  });

  it('has presets that use known options within limits and link to real topics', () => {
    STYLE_PRESETS.forEach(preset => {
      expect(getLyricsTopic(preset.topic)).not.toBeNull();
      STYLE_FIELDS.forEach(field => {
        const tags = field.options.map(option => option.tag);
        expect(preset.choice[field.id].length).toBeLessThanOrEqual(field.max);
        preset.choice[field.id].forEach(tag => expect(tags).toContain(tag));
      });
      expect(buildStylePrompt(preset.choice).length).toBeLessThanOrEqual(120);
    });
  });

  it('uses English tags only', () => {
    STYLE_FIELDS.forEach(field => field.options.forEach(option => expect(option.tag).toMatch(/^[a-z0-9&' -]+$/)));
  });
});
