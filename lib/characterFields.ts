// Length limits for character fields, shared by the forms (maxLength) and the APIs (validation).
// The descriptions become part of the model's instructions on every chat turn, so the server
// must enforce these even though the forms already do.

export const CHARACTER_LIMITS = {
  name: 40,
  shortDescription: 280,
  greeting: 300,
  longDescription: 4000,
  example: 2000,
  categoryCount: 8,
  categoryLength: 24
} as const;

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const FIELD_LABELS = {
  name: '캐릭터 이름',
  shortDescription: '한 줄 소개',
  greeting: '첫 인사말',
  longDescription: '상세 설정',
  example: '대화 예시'
} as const;

export type CharacterTextField = keyof typeof FIELD_LABELS;

const tooLong = (label: string, limit: number) =>
  `${label}은(는) ${limit.toLocaleString('ko-KR')}자 이하로 입력해 주세요.`;

// The first limit violation as a user-facing message, or null when everything fits.
export function findCharacterLimitError(
  values: Partial<Record<CharacterTextField, string | null | undefined>>,
  categories: string[] = []
): string | null {
  for (const key of Object.keys(FIELD_LABELS) as CharacterTextField[]) {
    const value = values[key];
    if (typeof value === 'string' && value.length > CHARACTER_LIMITS[key]) {
      return tooLong(FIELD_LABELS[key], CHARACTER_LIMITS[key]);
    }
  }
  if (categories.length > CHARACTER_LIMITS.categoryCount) {
    return `카테고리는 ${CHARACTER_LIMITS.categoryCount}개까지 추가할 수 있어요.`;
  }
  if (categories.some(category => category.length > CHARACTER_LIMITS.categoryLength)) {
    return tooLong('카테고리', CHARACTER_LIMITS.categoryLength);
  }
  return null;
}

// Categories from the form's JSON field: strings only, trimmed, without blanks or duplicates.
// Returns null when the field is not a JSON array.
export function parseCategories(raw: string | undefined): string[] | null {
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return null;
    }
    const cleaned = parsed
      .filter((item): item is string => typeof item === 'string')
      .map(item => item.trim())
      .filter(Boolean);
    return Array.from(new Set(cleaned));
  } catch {
    return null;
  }
}
