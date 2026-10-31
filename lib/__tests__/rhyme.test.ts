import { findRhymes, rhymeSyllables } from '@/lib/rhyme';
import { RHYME_WORDS } from '@/lib/rhymeWords';

const wordsIn = (query: string, length: number, words?: string[]) =>
  findRhymes(query, words)?.groups.find(group => group.length === length)?.words ?? [];

describe('rhymeSyllables', () => {
  it('keeps Hangul syllables only and reduces glides to the sung vowel', () => {
    expect(rhymeSyllables('너와 나!').map(s => s.char).join('')).toBe('너와나');
    expect(rhymeSyllables('야 워 위 에 애').map(s => s.vowel)).toEqual(['ㅏ', 'ㅓ', 'ㅣ', 'ㅐ', 'ㅐ']);
    expect(rhymeSyllables('love')).toEqual([]);
  });

  it('records the final consonant', () => {
    const [sa, rang] = rhymeSyllables('사랑');
    expect(sa.coda).toBe(0);
    expect(rang.coda).not.toBe(0);
  });
});

describe('findRhymes', () => {
  it('returns null without Hangul', () => {
    expect(findRhymes('')).toBeNull();
    expect(findRhymes('abc 123')).toBeNull();
  });

  it('groups by how many final vowels match, longest first', () => {
    const result = findRhymes('사랑', ['마당', '희망', '첫사랑', '사탕', '눈물', '바다']);
    expect(result?.pattern).toEqual(['ㅏ', 'ㅏ']);
    expect(result?.groups.map(group => group.length)).toEqual([2, 1]);
    // Same final consonant (ㅇ) first, so 마당 and 사탕 come before 바다.
    expect(wordsIn('사랑', 2, ['바다', '마당', '사탕'])).toEqual(['마당', '사탕', '바다']);
    expect(wordsIn('사랑', 1, ['희망'])).toEqual(['희망']);
  });

  it('leaves out words that only repeat the query', () => {
    const words = wordsIn('사랑', 2, ['첫사랑', '내 사랑', '사랑', '사랑아', '사랑한 날', '자랑']);
    expect(words).toEqual(['자랑']);
    expect(wordsIn('첫사랑', 2, ['사랑', '바람'])).toEqual(['바람']);
  });

  it('matches up to three syllables', () => {
    expect(wordsIn('너와 나', 3, ['떠나가', '바나나'])).toEqual(['떠나가']);
    expect(wordsIn('너와 나', 2, ['떠나가', '바나나'])).toEqual(['바나나']);
  });

  it('finds multi-syllable rhymes for common lyric words in the built-in bank', () => {
    ['사랑', '눈물', '하늘', '기억', '추억', '이별'].forEach(word => {
      expect(wordsIn(word, 2).length).toBeGreaterThan(5);
    });
  });
});

describe('RHYME_WORDS', () => {
  it('is a deduped list of Hangul words', () => {
    expect(RHYME_WORDS.length).toBeGreaterThan(800);
    expect(new Set(RHYME_WORDS).size).toBe(RHYME_WORDS.length);
    RHYME_WORDS.forEach(word => expect(word).toMatch(/^[가-힣]+( [가-힣]+)*$/));
  });
});
