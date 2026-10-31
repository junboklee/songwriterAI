import type { GetServerSideProps } from 'next';

import { buildSitemap } from '@/lib/siteFeeds';

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
