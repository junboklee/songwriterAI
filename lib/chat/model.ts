// Types, static data and pure helpers shared by the chat page and its components.

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export type ConversationSummary = {
  id: string;
  threadId: string;
  title: string | null;
  lastMessagePreview: string;
  updatedAt: string | null;
  characterId: string | null;
};

export type CharacterProfile = {
  id: string;
  name: string;
  tag: string;
  avatar: string;
  greeting: string;
  description: string;
  availability: string;
  videoUrl?: string | null;
};

export type CustomCharacterProfile = {
  id: string;
  name: string;
  summary: string;
  greeting: string;
  longDescription: string;
  avatarUrl: string | null;
  categories: string[];
  videoUrl?: string | null;
};

export type ResolvedCharacter = {
  id: string;
  name: string;
  avatar: string;
  description: string;
  availability: string;
  greeting: string;
  videoUrl: string | null;
};

export type CharacterMeta = {
  id: string;
  name: string;
  avatar: string;
  description: string;
};

export type RoleplayPrompt = {
  label: string;
  prompt: string;
  emoji: string;
};

export const TEXT = {
  sidebarTitle: '최근 대화',
  loadingTitle: '불러오는 중…',
  loadingDescription: '최근 대화를 불러오고 있습니다.',
  errorTitle: '대화를 불러오지 못했어요',
  errorDescription: '최근 대화를 불러오지 못했습니다.',
  emptyTitle: '아직 대화가 없어요',
  emptyDescription: '첫 메시지를 보내면 목록이 채워집니다.',
  pinnedTitle: '역할 놀이 프롬프트',
  emptyPreview: '최근 메시지가 없습니다.',
  sessionExpired: '세션이 만료되었습니다. 다시 로그인해 주세요.',
  rateLimited: '요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.',
  requestFailed: '답변을 받지 못했어요. 잠시 후 다시 시도해 주세요.',
  emptyReply: '답변을 만들지 못했어요. 잠시 후 다시 시도해 주세요.',
  unexpectedError: '알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해 주세요.',
  threadLoadError: '대화를 불러오지 못했습니다.',
  loadingRecent: '여러 대화를 불러오고 있습니다.',
  summaryFallback: '사용자가 만든 맞춤형 캐릭터입니다.',
  defaultTag: '커스텀 캐릭터'
};

export const CHARACTER_PROFILES: Record<string, CharacterProfile> = {
  '1': {
    id: '1',
    name: 'Dayeon',
    tag: 'Empathy',
    avatar: '/avatars/dayeon.png',
    greeting: '왔구나! 오늘 하루는 어땠어? 이야기 들려주면 노래로 만들어 볼게 🎵',
    description: '가수를 꿈꾸며 매일 가사를 쓰는 싱어송라이터. 긴 하루 끝, 마음을 노래로 바꿔 줄게.',
    availability: '주로 밤에 활동해요'
  }
};

export const QUICK_REPLIES = [
  '지금 가사를 만들고 라이브러리에 저장해줘',
  '크리스마스에 어울리는 캐롤송을 작사해줘.',
  '안녕, 반가워',
  '오늘 하루는 어땠어?'
];

export const ROLEPLAY_PROMPTS: RoleplayPrompt[] = [
  {
    label: '비 오는 날 카페 씬',
    prompt: '비 오는 오후, 카페 창가에서 우연히 마주친 사이처럼 이야기해 줘.',
    emoji: '☔️'
  },
  {
    label: '동창회 재회',
    prompt: '고등학교 동창회에서 오랜만에 만난 친구로 대화해 줘.',
    emoji: '🎉'
  },
  {
    label: '탐정과 조수',
    prompt: '탐정과 조수가 되어 미스터리 사건을 함께 해결하는 상황극을 시작하자.',
    emoji: '🕵️'
  },
  {
    label: '응원단장 모드',
    prompt: '응원단장처럼 오늘 하루를 힘차게 응원해 줘.',
    emoji: '🎈'
  },
  {
    label: '판타지 모험 준비',
    prompt: '판타지 세계의 마법사와 여행자가 모험 계획을 세우는 장면을 연기해 줘.',
    emoji: '✨'
  }
];

export const normaliseMessages = (items: ChatMessage[]) =>
  items
    .filter(item => (item.role === 'assistant' || item.role === 'user') && item.content)
    .map(item => ({ ...item, content: item.content.trim() }))
    .filter(item => item.content.length > 0);

// Fallback for replies without a <lyrics> block: short, multi-line text is treated as lyrics.
export const isLikelyLyrics = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  const lines = trimmed.split(/\r?\n/).map(line => line.trim());
  const meaningful = lines.filter(line => line.length > 0);
  if (meaningful.length < 3) {
    return false;
  }

  const shortLineCount = meaningful.filter(line => line.length <= 80).length;
  return (
    trimmed.includes('\n') && shortLineCount >= Math.max(3, Math.round(meaningful.length * 0.6))
  );
};

export const getTimestampValue = (value?: string | null) => {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
