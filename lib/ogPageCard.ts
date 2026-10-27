import { getLyricsTopic } from '@/lib/lyricsTopics';

// Link-preview cards for the public pages: the landing page ('home') and each /lyrics topic.
// Everything here is static, so the image route can cache the result.

export type PageCard = { title: string; lyrics: string; label: string };

const HOME_CARD: PageCard = {
  title: '내 이야기가 노래 가사로',
  lyrics:
    'AI 싱어송라이터와 대화하면\n오늘의 이야기가 가사가 돼요\n생일 노래 · 축가 · 고백 노래\n가입 없이 바로 체험해 보세요',
  label: 'AI 작사'
};

export function pageCard(slug: string): PageCard | null {
  if (slug === 'home') {
    return HOME_CARD;
  }
  const topic = getLyricsTopic(slug);
  return topic ? { title: topic.title, lyrics: topic.sample.lyrics, label: `예시 가사 「${topic.sample.title}」` } : null;
}

export const pageCardPath = (slug: string) => `/api/og/page/${slug}`;
