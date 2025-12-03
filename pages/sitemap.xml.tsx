import type { GetServerSideProps } from 'next';

const SITE_URL = 'https://novasingerai.com';

const routes = [
  '/',
  '/character/create',
  '/chat',
  '/dashboard',
  '/features',
  '/history',
  '/pricing',
  '/settings',
  '/suno'
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
