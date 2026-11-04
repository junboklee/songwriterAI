const HANGUL_START = 0xac00;
const HANGUL_COUNT = 11172;

// Null when the word doesn't end in a Hangul syllable (a Latin name, say), so no particle fits.
export function hasFinalConsonant(word: string): boolean | null {
  const code = word.charCodeAt(word.length - 1) - HANGUL_START;
  return code >= 0 && code < HANGUL_COUNT ? code % 28 !== 0 : null;
}
