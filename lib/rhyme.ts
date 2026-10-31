// Rhyme finder for /lyrics/rhyme (no LLM calls). Korean rap and pop rhyme mostly on vowels, so a
// word rhymes when its last syllables share the query's vowels; a matching final consonant
// (받침) on the last syllable makes it a closer rhyme and sorts it first.

import { RHYME_WORDS } from '@/lib/rhymeWords';

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

// Medial vowels reduced to the vowel that is actually sung, so glides rhyme with their base
// (야/아, 워/어, 위/이) and ㅐ/ㅔ, which sound the same, share one key.
const CORE_VOWEL = [
  'ㅏ', 'ㅐ', 'ㅏ', 'ㅐ', 'ㅓ', 'ㅐ', 'ㅓ', 'ㅐ', 'ㅗ', 'ㅏ', 'ㅐ', 'ㅐ', 'ㅗ', 'ㅜ', 'ㅓ', 'ㅐ', 'ㅣ', 'ㅜ', 'ㅡ', 'ㅣ', 'ㅣ'
];

// How far back to compare. Three matching syllables is already a long multi-syllable rhyme.
export const MAX_RHYME_LENGTH = 3;

export type RhymeSyllable = { char: string; vowel: string; coda: number };

export function rhymeSyllables(text: string): RhymeSyllable[] {
  const result: RhymeSyllable[] = [];
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code < HANGUL_START || code > HANGUL_END) {
      continue;
    }
    const index = code - HANGUL_START;
    result.push({ char, vowel: CORE_VOWEL[Math.floor(index / 28) % 21], coda: index % 28 });
  }
  return result;
}

const trailingVowelMatches = (a: RhymeSyllable[], b: RhymeSyllable[]) => {
  let count = 0;
  while (
    count < MAX_RHYME_LENGTH &&
    count < a.length &&
    count < b.length &&
    a[a.length - 1 - count].vowel === b[b.length - 1 - count].vowel
  ) {
    count += 1;
  }
  return count;
};

export type RhymeGroup = { length: number; words: string[] };
export type RhymeResult = { pattern: string[]; groups: RhymeGroup[] };

// Groups words by how many final syllables rhyme with the query, longest rhymes first. Words that
// merely contain the query or sit inside it (사랑 → 첫사랑, 사랑아) are not rhymes and are left out.
export function findRhymes(query: string, words: string[] = RHYME_WORDS): RhymeResult | null {
  const target = rhymeSyllables(query);
  if (!target.length) {
    return null;
  }
  const targetText = target.map(syllable => syllable.char).join('');
  const last = target[target.length - 1];
  const tail = target.slice(-MAX_RHYME_LENGTH);

  const matches = words.flatMap((word, order) => {
    const syllables = rhymeSyllables(word);
    const text = syllables.map(syllable => syllable.char).join('');
    if (!text || text.includes(targetText) || targetText.includes(text)) {
      return [];
    }
    const length = trailingVowelMatches(target, syllables);
    if (!length) {
      return [];
    }
    const sameCoda = syllables[syllables.length - 1].coda === last.coda;
    return [{ word, length, sameCoda, sameSize: syllables.length === target.length, size: syllables.length, order }];
  });

  matches.sort(
    (a, b) =>
      b.length - a.length ||
      Number(b.sameCoda) - Number(a.sameCoda) ||
      Number(b.sameSize) - Number(a.sameSize) ||
      a.size - b.size ||
      a.order - b.order
  );

  const groups: RhymeGroup[] = [];
  for (const match of matches) {
    const group = groups[groups.length - 1];
    if (group?.length === match.length) {
      group.words.push(match.word);
    } else {
      groups.push({ length: match.length, words: [match.word] });
    }
  }

  return { pattern: tail.map(syllable => syllable.vowel), groups };
}
