import { SITE_PAGES, SITE_URL, escapeXml, pageUrl } from '@/lib/sitePages';

export const buildSitemap = () => {
  const urls = SITE_PAGES.map(page => {
    const lastmod = page.updated ? `<lastmod>${page.updated}</lastmod>` : '';
    return `<url><loc>${pageUrl(page.path)}</loc>${lastmod}<changefreq>weekly</changefreq><priority>0.7</priority></url>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
};

// RSS 2.0 feed of the lyric guides and free tools. Naver Search Advisor collects pages from a
// submitted feed, so new topic pages reach Naver without waiting for a sitemap crawl.
const CHANNEL_TITLE = 'NovaSingerAI 노래 가사 만들기';
const CHANNEL_DESCRIPTION =
  '생일·축가·이별 노래처럼 상황별 가사 만드는 법과 예시 가사, 가사 음절 수 세기, Suno 스타일 만들기 같은 무료 도구를 소개해요.';

// Dates are calendar days in Korea; publish them as 09:00 KST.
const toRfc822 = (day: string) => new Date(`${day}T09:00:00+09:00`).toUTCString();

export const buildRss = () => {
  const items = SITE_PAGES.filter(page => page.title && page.description && page.updated)
    .map((page, index) => ({ page, index }))
    // Newest first; pages from the same day keep their site order.
    .sort((a, b) => (b.page.updated as string).localeCompare(a.page.updated as string) || a.index - b.index)
    .map(({ page }) => page);

  const itemXml = items
    .map(page => {
      const url = pageUrl(page.path);
      return `<item><title>${escapeXml(page.title as string)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid><description>${escapeXml(page.description as string)}</description><pubDate>${toRfc822(page.updated as string)}</pubDate></item>`;
    })
    .join('\n');

  const lastBuild = items.length ? `<lastBuildDate>${toRfc822(items[0].updated as string)}</lastBuildDate>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${escapeXml(CHANNEL_TITLE)}</title>
<link>${SITE_URL}/lyrics</link>
<description>${escapeXml(CHANNEL_DESCRIPTION)}</description>
<language>ko</language>
${lastBuild}
<atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml"/>
${itemXml}
</channel>
</rss>`;
};
