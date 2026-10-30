import type { GetServerSideProps } from 'next';

import { LYRICS_TOPICS } from '@/lib/lyricsTopics';

const SITE_URL = 'https://novasingerai.com';

// Public, indexable pages only. Logged-in areas are disallowed in robots.txt and /s/* share pages are noindex.
const routes = [
  '/',
  '/lyrics',
  '/lyrics/check',
  '/lyrics/style',
  ...LYRICS_TOPICS.map(topic => `/lyrics/${topic.slug}`),
  '/explore',
  '/pricing',
  '/terms',
  '/privacy',
  '/safety'
];

const buildSitemap = () => {
  const lastmod = new Date().toISOString();

  const urls = routes
    .map(path => {
      const normalizedPath = path === '/' ? '' : path;
      return `<url><loc>${SITE_URL}${normalizedPath}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`;
    })
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;
};

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const sitemap = buildSitemap();
  res.setHeader('Content-Type', 'text/xml');
  res.write(sitemap);
  res.end();

  return {
    props: {}
  };
};

export default function Sitemap() {
  return null;
}
