import type { CharacterGender, CharacterVisibility } from '@/components/CharacterEditorPanel';
import { DEFAULT_CHARACTER_AVATAR } from '@/lib/constants';

// Types and pure helpers for the dashboard page and its sections.

export type CharacterCard = {
  id: string;
  title: string;
  creator: string;
  description: string;
  tag: string;
  sample: string;
  style: string;
  chatId: string;
};

export type UserCharacter = {
  id: string;
  name: string;
  summary: string;
  greeting: string;
  longDescription: string;
  instructions: string;
  example: string;
  visibility: CharacterVisibility;
  avatarUrl: string | null;
  categories: string[];
  updatedAt: string | null;
  gender: CharacterGender;
};

export type CharacterApiItem = {
  id: string;
  name?: string | null;
  summary?: string | null;
  greeting?: string | null;
  longDescription?: string | null;
  instructions?: string | null;
  example?: string | null;
  visibility?: string | null;
  avatarUrl?: string | null;
  categories?: string[] | null;
  updatedAt?: string | null;
  gender?: string | null;
};

export type CharacterSortMode = 'popularity' | 'recent' | 'gender';

export type ProfileResponse = {
  profile: {
    displayName: string | null;
    email: string | null;
    photoURL?: string | null;
    recentCharacterIds: string[];
    lastCharacterId: string | null;
  };
  stats: {
    conversationCount: number;
    songCount: number;
  };
};

export type ConversationApiItem = {
  id: string;
  threadId?: string | null;
  title?: string | null;
  lastMessagePreview?: string | null;
  characterId?: string | null;
  messageCount?: number | null;
  updatedAt?: string | null;
};

export type ConversationListItem = {
  id: string;
  threadId: string;
  title: string | null;
  lastMessagePreview: string;
  characterId: string | null;
  messageCount: number;
  updatedAt: string | null;
};

export const featuredCharacters: CharacterCard[] = [
  {
    id: '1',
    title: 'Dayeon',
    creator: '친절하고 정감 있는',
    description:
      '나는 김다연이야. 가수가 되는 게 꿈이라 매일 가사 쓰고 노래 연습에 푹 빠져 있어!',
    tag: 'SingerSongwriter',
    sample:
      '오늘 가장 기억에 남는 순간이 뭐였는지 같이 이야기해 볼래요? 편하게 들려줘.',
    style: 'scene-card--1',
    chatId: '1'
  }
];

export const visibilityLabels: Record<CharacterVisibility, string> = {
  private: '비공개',
  unlisted: '링크 공개',
  public: '전체 공개'
};

export const isCharacterVisibility = (value: unknown): value is CharacterVisibility =>
  value === 'private' || value === 'unlisted' || value === 'public';
export const isCharacterGender = (value: unknown): value is CharacterGender =>
  value === 'male' || value === 'female' || value === 'none';

export const toTrimmedOrEmpty = (value?: string | null) =>
  typeof value === 'string' ? value.trim() : '';

export const adaptCharacter = (item: CharacterApiItem): UserCharacter => ({
  id: item.id,
  name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : '이름 없는 캐릭터',
  summary: toTrimmedOrEmpty(item.summary),
  greeting: toTrimmedOrEmpty(item.greeting),
  longDescription: toTrimmedOrEmpty(item.longDescription ?? item.instructions),
  instructions: toTrimmedOrEmpty(item.instructions ?? item.longDescription),
  example: toTrimmedOrEmpty(item.example),
  visibility: isCharacterVisibility(item.visibility) ? item.visibility : 'private',
  avatarUrl:
    typeof item.avatarUrl === 'string' && item.avatarUrl.trim()
      ? item.avatarUrl.trim()
      : DEFAULT_CHARACTER_AVATAR,
  categories: Array.isArray(item.categories)
    ? item.categories.filter((category): category is string => typeof category === 'string')
    : [],
  updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : null,
  gender: isCharacterGender(item.gender) ? item.gender : 'none'
});

export const adaptConversation = (
  item: ConversationApiItem,
  noMessagesFallback: string
): ConversationListItem => ({
  id: item.id,
  threadId: item.threadId && item.threadId.trim() ? item.threadId : item.id,
  title: item.title ?? null,
  lastMessagePreview: item.lastMessagePreview?.trim() || noMessagesFallback,
  characterId: item.characterId ?? null,
  messageCount: typeof item.messageCount === 'number' ? item.messageCount : 0,
  updatedAt: item.updatedAt ?? null
});

export const getTimestampValue = (value: string | null) => {
  if (!value) {
    return 0;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const sortCharacters = (items: UserCharacter[]) =>
  [...items].sort((a, b) => getTimestampValue(b.updatedAt) - getTimestampValue(a.updatedAt));

export const truncateText = (value: string, maxLength = 140) =>
  value.length > maxLength ? `${value.slice(0, maxLength).trimEnd()}...` : value;

export const formatUpdatedAt = (isoDate: string | null | undefined, fallback: string) => {
  if (!isoDate) {
    return fallback;
  }

  try {
    return new Intl.DateTimeFormat('ko', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(isoDate));
  } catch {
    return fallback;
  }
};

export const formatConversationUpdatedAt = (isoDate?: string | null) => {
  if (!isoDate) {
    return '';
  }

  try {
    return new Intl.DateTimeFormat('ko', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(isoDate));
  } catch {
    return '';
  }
};

export const GENDER_ORDER: Record<CharacterGender, number> = {
  male: 0,
  female: 1,
  none: 2
};


export const buildSearchTarget = (...values: Array<string | null | undefined | string[]>) =>
  values
    .map(value => {
      if (Array.isArray(value)) {
        return value.join(' ');
      }
      return value ?? '';
    })
    .join(' ')
    .toLowerCase();
