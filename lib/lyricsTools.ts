// Deterministic songwriting helpers (no LLM calls): syllable counts, end-rhyme grouping, line diff.

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
const SECTION_TAG = /^\[[^\]]*\]$/;

// Medial vowels of composed Hangul syllables, grouped so that near-rhymes match
// (e.g. ㅐ/ㅔ sound the same in modern Korean, ㅙ/ㅚ/ㅞ likewise).
const JUNGSEONG_GROUP = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅐ', 'ㅓ', 'ㅐ', 'ㅕ', 'ㅐ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅙ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅙ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'
];

const isHangul = (char: string) => {
  const code = char.charCodeAt(0);
  return code >= HANGUL_START && code <= HANGUL_END;
};

const countLatinSyllables = (word: string) => {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!cleaned) {
    return 0;
  }
  const groups = cleaned.replace(/e$/, '').match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 0);
};

export function countSyllables(line: string) {
  let count = 0;
  let latinWord = '';

  for (const char of line) {
    if (isHangul(char)) {
      count += 1 + countLatinSyllables(latinWord);
      latinWord = '';
    } else if (/[a-zA-Z']/.test(char)) {
      latinWord += char;
    } else {
      count += countLatinSyllables(latinWord);
      latinWord = '';
    }
  }

  return count + countLatinSyllables(latinWord);
}

// Key used to group lines whose final sung syllable shares a vowel sound.
export function endRhymeKey(line: string): string | null {
  const chars = Array.from(line.replace(/[\s\p{P}\p{S}]+$/u, ''));
  const last = chars[chars.length - 1];
  if (!last) {
    return null;
  }

  if (isHangul(last)) {
    const index = last.charCodeAt(0) - HANGUL_START;
    return JUNGSEONG_GROUP[Math.floor(index / 28) % 21] ?? null;
  }

  const word = line.toLowerCase().match(/[a-z']+$/)?.[0];
  const ending = word?.match(/[aeiouy]+[^aeiouy]*$/)?.[0];
  return ending ? `en:${ending}` : null;
}

export type LineAnalysis = {
  text: string;
  isSection: boolean;
  isBlank: boolean;
  syllables: number;
  rhymeGroup: number | null;
};

// Rhyme groups are numbered per section so colours restart for each verse/chorus.
export function analyzeLyrics(lyrics: string): LineAnalysis[] {
  const lines = lyrics.split(/\r?\n/);
  const result: LineAnalysis[] = [];
  let sectionLines: Array<{ index: number; key: string | null }> = [];

  const flushSection = () => {
    const counts = new Map<string, number>();
    sectionLines.forEach(item => {
      if (item.key) {
        counts.set(item.key, (counts.get(item.key) ?? 0) + 1);
      }
    });
    const groupIds = new Map<string, number>();
    sectionLines.forEach(item => {
      if (item.key && (counts.get(item.key) ?? 0) >= 2) {
        if (!groupIds.has(item.key)) {
          groupIds.set(item.key, groupIds.size);
        }
        result[item.index].rhymeGroup = groupIds.get(item.key) ?? null;
      }
    });
    sectionLines = [];
  };

  lines.forEach(raw => {
    const text = raw.trim();
    const isSection = SECTION_TAG.test(text);
    const isBlank = text.length === 0;

    if (isSection) {
      flushSection();
    }

    result.push({
      text: raw,
      isSection,
      isBlank,
      syllables: isSection || isBlank ? 0 : countSyllables(text),
      rhymeGroup: null
    });

    if (!isSection && !isBlank) {
      sectionLines.push({ index: result.length - 1, key: endRhymeKey(text) });
    }
  });

  flushSection();
  return result;
}

export type DiffLine = {
  type: 'same' | 'added' | 'removed';
  text: string;
};

// Line-level LCS diff from `before` to `after`.
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split(/\r?\n/);
  const b = after.split(/\r?\n/);
  const table: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0)
  );

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const diff: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      diff.push({ type: 'same', text: a[i] });
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      diff.push({ type: 'removed', text: a[i] });
      i += 1;
    } else {
      diff.push({ type: 'added', text: b[j] });
      j += 1;
    }
  }
  while (i < a.length) {
    diff.push({ type: 'removed', text: a[i] });
    i += 1;
  }
  while (j < b.length) {
    diff.push({ type: 'added', text: b[j] });
    j += 1;
  }

  return diff;
}
