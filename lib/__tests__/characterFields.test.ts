import { CHARACTER_LIMITS, findCharacterLimitError, parseCategories } from '@/lib/characterFields';

describe('findCharacterLimitError', () => {
  it('accepts values within the limits', () => {
    expect(
      findCharacterLimitError(
        { name: 'a'.repeat(CHARACTER_LIMITS.name), longDescription: 'b'.repeat(CHARACTER_LIMITS.longDescription) },
        ['발라드']
      )
    ).toBeNull();
  });

  it('names the first field that is too long', () => {
    expect(findCharacterLimitError({ greeting: 'x'.repeat(301) })).toBe('첫 인사말은(는) 300자 이하로 입력해 주세요.');
    expect(findCharacterLimitError({ name: 'x'.repeat(41), greeting: 'x'.repeat(301) })).toContain('캐릭터 이름');
  });

  it('limits the number and length of categories', () => {
    expect(findCharacterLimitError({}, Array.from({ length: 9 }, (_, index) => `t${index}`))).toBe(
      '카테고리는 8개까지 추가할 수 있어요.'
    );
    expect(findCharacterLimitError({}, ['x'.repeat(25)])).toContain('카테고리');
  });
});

describe('parseCategories', () => {
  it('keeps trimmed, unique strings', () => {
    expect(parseCategories(JSON.stringify([' 발라드 ', '발라드', '', 'R&B', 7, null]))).toEqual(['발라드', 'R&B']);
  });

  it('returns null for a missing or malformed field', () => {
    expect(parseCategories(undefined)).toBeNull();
    expect(parseCategories('not json')).toBeNull();
    expect(parseCategories('{"a":1}')).toBeNull();
  });
});
