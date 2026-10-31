import type { GetServerSideProps } from 'next';

import { buildRss } from '@/lib/siteFeeds';

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.write(buildRss());
  res.end();

  return {
    props: {}
  };
};

export default function Rss() {
  return null;
}
