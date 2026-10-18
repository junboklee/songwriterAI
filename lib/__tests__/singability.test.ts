import { checkSingability, lineRange, longestHardBatchimRun } from '@/lib/singability';

// A natural Korean verse/chorus from a real model reply: nothing should be flagged.
const CLEAN = `[Verse 1]
창문을 두드리는 비가 밤을 적셔와
젖은 골목 끝에 네 생각이 번져가
가로등 아래 고인 물에 흔들리는 마음
조용한 이 밤은 너로 더 깊어져 가

[Chorus]
비 오는 밤 끝에서
너를 한 번 더 불러봐
멈춘 시간 속에서
나는 아직 너를 봐`;

const kinds = (lyrics: string) => checkSingability(lyrics).map(issue => [issue.kind, issue.line]);

describe('checkSingability', () => {
  it('does not flag natural lyrics', () => {
    expect(checkSingability(CLEAN)).toEqual([]);
  });

  it('flags a line far from the section’s usual length, with the target', () => {
    const lyrics = `[Verse]
오늘도 너를 생각해
창밖엔 비가 내리네
우리는 다시 만날까
그날의 너와 나는 아직도 같은 자리에서 서로를 기다려`;
    const issues = checkSingability(lyrics);
    expect(issues).toEqual([expect.objectContaining({ kind: 'tooLong', line: 4, syllables: 22 })]);

    const uneven = checkSingability(`[Verse]
오늘도 너를 생각해
창밖엔 비가 내리네
우리는 다시 만날까
안녕`);
    expect(uneven).toEqual([expect.objectContaining({ kind: 'uneven', line: 4, syllables: 2, target: 8 })]);
  });

  it('flags digits, emoji, Korean-English mixing and stacked stop consonants', () => {
    expect(kinds('[Verse]\n3월의 바람\n너를 만나 행복해 💖\nBaby 오늘 밤\n꽃잎 닫혀 버린 밤')).toEqual([
      ['digits', 1],
      ['symbols', 2],
      ['mixedLanguage', 3],
      ['denseBatchim', 4]
    ]);
  });

  it('leaves parentheses (backing vocals) and single letters alone', () => {
    expect(checkSingability('[Chorus]\n너를 불러 (불러)\n오 나의 별 A')).toEqual([]);
  });

  it('suggests section tags for longer lyrics without any', () => {
    expect(checkSingability('하나\n둘\n셋\n넷')).toEqual([expect.objectContaining({ kind: 'noSections', line: null })]);
    expect(checkSingability('하나\n둘')).toEqual([]);
  });
});

describe('longestHardBatchimRun', () => {
  it('counts only stop-like finals across spaces', () => {
    expect(longestHardBatchimRun('꽃잎 닫혀')).toBe(3);
    expect(longestHardBatchimRun('젖은 골목 끝에')).toBe(2);
    expect(longestHardBatchimRun('사랑한 마음')).toBe(0);
  });
});

describe('lineRange', () => {
  it('returns the character range of a line', () => {
    const lyrics = '[Verse]\n첫 줄\n둘째 줄';
    const range = lineRange(lyrics, 2);
    expect(range).toEqual({ start: 12, end: 16, text: '둘째 줄' });
    expect(lyrics.slice(range.start, range.end)).toBe('둘째 줄');
  });
});
