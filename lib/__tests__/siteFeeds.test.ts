import { LYRICS_TOPICS } from '@/lib/lyricsTopics';
import { buildRss, buildSitemap } from '@/lib/siteFeeds';
import { SITE_PAGES, escapeXml } from '@/lib/sitePages';

const DAY = /^\d{4}-\d{2}-\d{2}$/;

describe('site pages', () => {
  it('lists each public page once, with real calendar dates', () => {
    const paths = SITE_PAGES.map(page => page.path);
    expect(new Set(paths).size).toBe(paths.length);
    LYRICS_TOPICS.forEach(topic => expect(paths).toContain(`/lyrics/${topic.slug}`));
    SITE_PAGES.forEach(page => {
      if (page.updated) {
        expect(page.updated).toMatch(DAY);
        expect(Number.isNaN(Date.parse(page.updated))).toBe(false);
      }
    });
  });

  it('dates /lyrics by its newest guide or tool', () => {
    const lyrics = SITE_PAGES.find(page => page.path === '/lyrics');
    const newest = SITE_PAGES.filter(page => page.path.startsWith('/lyrics/'))
      .map(page => page.updated as string)
      .sort()
      .pop();
    expect(lyrics?.updated).toBe(newest);
  });

  it('escapes XML special characters', () => {
    expect(escapeXml(`a & b < c > "d" 'e'`)).toBe('a &amp; b &lt; c &gt; &quot;d&quot; &apos;e&apos;');
  });
});

describe('buildSitemap', () => {
  it('reports stored dates instead of the request time', () => {
    const xml = buildSitemap();
    expect(xml).toContain('<loc>https://novasingerai.com</loc><changefreq>');
    expect(xml).toContain('<loc>https://novasingerai.com/lyrics/birthday-song</loc><lastmod>2026-10-19</lastmod>');
    expect(xml).not.toContain(new Date().toISOString().slice(0, 10) + 'T');
  });
});

describe('buildRss', () => {
  const xml = buildRss();
  const items = xml.match(/<item>.*?<\/item>/g) ?? [];

  it('has one item per topic and tool, newest first', () => {
    expect(items).toHaveLength(LYRICS_TOPICS.length + 2);
    const dates = items.map(item => Date.parse(item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] ?? ''));
    dates.forEach(date => expect(Number.isNaN(date)).toBe(false));
    expect([...dates].sort((a, b) => b - a)).toEqual(dates);
    expect(items[0]).toContain('<link>https://novasingerai.com/lyrics/check</link>');
  });

  it('publishes Korean calendar days as 09:00 KST', () => {
    const birthday = items.find(item => item.includes('/lyrics/birthday-song<'));
    expect(birthday).toContain('<pubDate>Mon, 19 Oct 2026 00:00:00 GMT</pubDate>');
    expect(birthday).toContain('<title>생일 축하 노래 가사 만들기</title>');
  });

  it('is a well-formed RSS 2.0 channel', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain('<atom:link href="https://novasingerai.com/rss.xml" rel="self" type="application/rss+xml"/>');
    expect(xml).toContain('<lastBuildDate>Fri, 30 Oct 2026 00:00:00 GMT</lastBuildDate>');
    // Raw ampersands or angle brackets in text would break the feed.
    expect(xml.replace(/&(amp|lt|gt|quot|apos);/g, '')).not.toMatch(/&/);
  });
});
