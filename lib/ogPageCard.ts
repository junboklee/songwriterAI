import { getLyricsTopic } from '@/lib/lyricsTopics';

// Link-preview cards for the public pages: the landing page ('home'), the free tools ('check',
// 'style', 'rhyme', 'structure', 'maker') and each /lyrics topic.
// Everything here is static, so the image route can cache the result.

export type PageCard = { title: string; lyrics: string; label: string };

const HOME_CARD: PageCard = {
  title: '내 이야기가 노래 가사로',
  lyrics:
    'AI 싱어송라이터와 대화하면\n오늘의 이야기가 가사가 돼요\n생일 노래 · 축가 · 고백 노래\n가입 없이 바로 체험해 보세요',
  label: 'AI 작사'
};

const CHECK_CARD: PageCard = {
  title: '가사 음절 수 세기 · 가창성 검사',
  lyrics: '줄마다 음절 수를 세고\n부르기 어려운 곳을 찾아요\n숫자 · 영어 섞임 · 끊기는 받침\n가입 없이 무료로 써 보세요',
  label: '무료 도구'
};

const STYLE_CARD: PageCard = {
  title: 'Suno 스타일 프롬프트 만들기',
  lyrics: '장르 · 분위기 · 빠르기 · 보컬 · 악기\n고르기만 하면 영어 프롬프트로\nSuno 스타일 칸에 바로 붙여 넣기\n가입 없이 무료로 써 보세요',
  label: '무료 도구'
};

const RHYME_CARD: PageCard = {
  title: '라임 찾기 · 한국어 각운 사전',
  lyrics: '사랑 · 마당 · 사탕 · 가방\n끝 모음이 같은 단어를 찾아요\n두 글자 · 세 글자 라임까지\n가입 없이 무료로 써 보세요',
  label: '무료 도구'
};

const STRUCTURE_CARD: PageCard = {
  title: '노래 구조 짜기 · Suno 가사 태그',
  lyrics: '[Intro] [Verse 1] [Chorus]\n순서를 고르고 구간마다 가사를 쓰면\n태그 붙은 가사로 정리해 줘요\n가입 없이 무료로 써 보세요',
  label: '무료 도구'
};

const MAKER_CARD: PageCard = {
  title: '이름 넣어 노래 가사 만들기',
  lyrics: '지민아 생일 축하해\n오늘은 온통 너의 날이야\n이름과 장소만 넣으면 가사 완성\n가입 없이 무료로 써 보세요',
  label: '무료 도구'
};

export function pageCard(slug: string): PageCard | null {
  if (slug === 'home') {
    return HOME_CARD;
  }
  if (slug === 'check') {
    return CHECK_CARD;
  }
  if (slug === 'style') {
    return STYLE_CARD;
  }
  if (slug === 'rhyme') {
    return RHYME_CARD;
  }
  if (slug === 'structure') {
    return STRUCTURE_CARD;
  }
  if (slug === 'maker') {
    return MAKER_CARD;
  }
  const topic = getLyricsTopic(slug);
  return topic ? { title: topic.title, lyrics: topic.sample.lyrics, label: `예시 가사 「${topic.sample.title}」` } : null;
}

export const pageCardPath = (slug: string) => `/api/og/page/${slug}`;
