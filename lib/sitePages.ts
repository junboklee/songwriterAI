import { PRIVACY_EFFECTIVE_DATE, SAFETY_POLICY_EFFECTIVE_DATE, TERMS_EFFECTIVE_DATE } from '@/lib/legal';
import { LYRICS_TOPICS } from '@/lib/lyricsTopics';

export const SITE_URL = 'https://novasingerai.com';

export type SitePage = {
  path: string;
  // YYYY-MM-DD of the last content change. Left out for pages whose content moves on its own
  // (home, explore), because a lastmod that is always "today" teaches crawlers to ignore it.
  updated?: string;
  // Pages with a title and description also go into the RSS feed.
  title?: string;
  description?: string;
};

const TOOL_PAGES: SitePage[] = [
  {
    path: '/lyrics/check',
    updated: '2026-10-30',
    title: '가사 음절 수 세기 · 가창성 검사기',
    description:
      '가사를 붙여 넣으면 줄마다 음절 수를 세고, 각운과 부르기 어려운 줄(숫자, 영어 섞임, 끊기는 받침, 너무 긴 줄)을 찾아 줘요. 가입 없이 무료로 써 보세요.'
  },
  {
    path: '/lyrics/style',
    updated: '2026-10-30',
    title: 'Suno 스타일 프롬프트 만들기',
    description:
      '장르, 분위기, 빠르기, 보컬, 악기를 고르면 Suno 스타일 칸에 바로 붙여 넣을 영어 프롬프트를 만들어 줘요. 생일 노래·축가·트로트 예시도 있어요. 가입 없이 무료.'
  }
];

const TOPIC_PAGES: SitePage[] = LYRICS_TOPICS.map(topic => ({
  path: `/lyrics/${topic.slug}`,
  updated: topic.updated,
  title: topic.title,
  description: topic.description
}));

const latest = (dates: string[]) => dates.reduce((a, b) => (a > b ? a : b));

// Public, indexable pages only. Logged-in areas are disallowed in robots.txt and /s/* share pages are noindex.
export const SITE_PAGES: SitePage[] = [
  { path: '/' },
  { path: '/lyrics', updated: latest([...TOOL_PAGES, ...TOPIC_PAGES].map(page => page.updated as string)) },
  ...TOOL_PAGES,
  ...TOPIC_PAGES,
  { path: '/explore' },
  { path: '/pricing', updated: '2026-10-27' },
  { path: '/terms', updated: TERMS_EFFECTIVE_DATE },
  { path: '/privacy', updated: PRIVACY_EFFECTIVE_DATE },
  { path: '/safety', updated: SAFETY_POLICY_EFFECTIVE_DATE }
];

export const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const pageUrl = (path: string) => `${SITE_URL}${path === '/' ? '' : path}`;
