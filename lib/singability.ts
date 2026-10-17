// Deterministic "can this be sung?" checks for Korean lyrics headed to AI music tools (Suno etc.).
// Each issue points at one line and carries what the UI needs to explain it and to prefill a
// line rewrite. The checks follow common Suno Korean advice: even syllable counts per line, no
// digits, no Korean/English mixing, fewer stacked stop consonants, no emoji or symbols.

import { countSyllables } from '@/lib/lyricsTools';

export type SingabilityKind =
  | 'tooLong'
  | 'uneven'
  | 'digits'
  | 'mixedLanguage'
  | 'denseBatchim'
  | 'symbols'
  | 'noSections';

export type SingabilityIssue = {
  kind: SingabilityKind;
  // Index into lyrics.split('\n'); null for issues about the whole lyric.
  line: number | null;
  severity: 'warn' | 'info';
  syllables?: number;
  // Typical syllable count of the line's section (for 'uneven' and 'tooLong').
  target?: number;
};

const SECTION_TAG = /^\[[^\]]*\]$/;
const HANGUL = /[가-힣]/;
const LATIN_WORD = /[A-Za-z]{2,}/;
// Emoji and symbols that tools either sing oddly or drop. Parentheses are left alone: Suno
// treats them as backing vocals on purpose.
const SYMBOLS = /[\p{Extended_Pictographic}*#@^_=<>{}|\\~♡♥★☆♪♫]/u;

export const MAX_LINE_SYLLABLES = 20;
const MIN_SECTION_LINES = 3;
const HARD_BATCHIM_RUN = 3;
// Final consonants (jongseong index) that can be held while singing: ㄴ ㄹ ㅁ ㅇ. Every other
// final (ㄱ ㄷ ㅂ ㅅ ㅈ ㅊ ㅋ ㅌ ㅍ ㅎ ㄲ ㅆ and clusters) cuts the vowel short.
const SONORANT_FINALS = new Set([4, 8, 16, 21]);

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};

// Longest run of consecutive Hangul syllables ending in a stop-like final consonant, ignoring
// spaces (sung phrases run across word gaps). "꽃잎 닫혀" -> 3.
export function longestHardBatchimRun(line: string) {
  let run = 0;
  let longest = 0;
  for (const char of line) {
    if (char === ' ') {
      continue;
    }
    const code = char.charCodeAt(0) - 0xac00;
    const final = code >= 0 && code <= 11171 ? code % 28 : 0;
    run = final !== 0 && !SONORANT_FINALS.has(final) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return longest;
}

export function checkSingability(lyrics: string): SingabilityIssue[] {
  const issues: SingabilityIssue[] = [];
  const lines = lyrics.split('\n');
  let sawSection = false;
  let lyricLineCount = 0;
  let section: Array<{ index: number; syllables: number }> = [];

  const flushSection = () => {
    if (section.length >= MIN_SECTION_LINES) {
      const target = median(section.map(item => item.syllables));
      const tolerance = Math.max(3, Math.round(target * 0.35));
      section.forEach(item => {
        if (item.syllables <= MAX_LINE_SYLLABLES && Math.abs(item.syllables - target) > tolerance) {
          issues.push({ kind: 'uneven', line: item.index, severity: 'warn', syllables: item.syllables, target });
        }
      });
    }
    section = [];
  };

  lines.forEach((raw, index) => {
    const text = raw.trim();
    if (!text) {
      return;
    }
    if (SECTION_TAG.test(text)) {
      sawSection = true;
      flushSection();
      return;
    }

    lyricLineCount += 1;
    const syllables = countSyllables(text);
    section.push({ index, syllables });

    if (syllables > MAX_LINE_SYLLABLES) {
      issues.push({ kind: 'tooLong', line: index, severity: 'warn', syllables, target: 14 });
    }
    if (/\d/.test(text)) {
      issues.push({ kind: 'digits', line: index, severity: 'warn' });
    }
    if (SYMBOLS.test(text)) {
      issues.push({ kind: 'symbols', line: index, severity: 'warn' });
    }
    if (HANGUL.test(text) && LATIN_WORD.test(text)) {
      issues.push({ kind: 'mixedLanguage', line: index, severity: 'info' });
    }
    if (longestHardBatchimRun(text) >= HARD_BATCHIM_RUN) {
      issues.push({ kind: 'denseBatchim', line: index, severity: 'info' });
    }
  });
  flushSection();

  if (!sawSection && lyricLineCount >= 4) {
    issues.push({ kind: 'noSections', line: null, severity: 'info' });
  }

  return issues.sort((a, b) => (a.line ?? -1) - (b.line ?? -1));
}

// Character range of one line, in the shape the line-rewrite panel expects.
export function lineRange(lyrics: string, lineIndex: number) {
  const lines = lyrics.split('\n');
  const start = lines.slice(0, lineIndex).reduce((sum, line) => sum + line.length + 1, 0);
  const text = lines[lineIndex] ?? '';
  return { start, end: start + text.length, text };
}
