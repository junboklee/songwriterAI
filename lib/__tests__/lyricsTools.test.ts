import { analyzeLyrics, countSyllables, diffLines, endRhymeKey } from '@/lib/lyricsTools';

describe('countSyllables', () => {
  it('counts one syllable per Hangul block, ignoring spaces and punctuation', () => {
    expect(countSyllables('새벽 두 시의 창가!')).toBe(7);
  });

  it('approximates English syllables by vowel groups', () => {
    expect(countSyllables('hello baby')).toBe(4);
  });

  it('handles mixed Korean and English', () => {
    expect(countSyllables('oh 사랑해')).toBe(4);
  });
});

describe('endRhymeKey', () => {
  it('groups final syllables by vowel sound', () => {
    expect(endRhymeKey('너의 눈에')).toBe(endRhymeKey('나의 새'));
    expect(endRhymeKey('창가')).toBe('ㅏ');
    expect(endRhymeKey('괜찮아...')).toBe('ㅏ');
  });

  it('returns null for empty lines', () => {
    expect(endRhymeKey('   ')).toBeNull();
  });
});

describe('analyzeLyrics', () => {
  it('marks section tags and numbers rhyme groups per section', () => {
    const result = analyzeLyrics('[Verse 1]\n밤하늘 아래\n너의 노래\n그리워\n\n[Chorus]\n괜찮아\n안아줘');

    expect(result[0]).toMatchObject({ isSection: true, syllables: 0 });
    expect(result[1].rhymeGroup).toBe(0);
    expect(result[2].rhymeGroup).toBe(0);
    expect(result[3].rhymeGroup).toBeNull();
    expect(result[4].isBlank).toBe(true);
    // 괜찮아(ㅏ) / 안아줘(ㅝ) don't rhyme with each other
    expect(result[6].rhymeGroup).toBeNull();
    expect(result[7].rhymeGroup).toBeNull();
  });
});

describe('diffLines', () => {
  it('reports added and removed lines', () => {
    expect(diffLines('a\nb\nc', 'a\nx\nc')).toEqual([
      { type: 'same', text: 'a' },
      { type: 'removed', text: 'b' },
      { type: 'added', text: 'x' },
      { type: 'same', text: 'c' }
    ]);
  });
});
