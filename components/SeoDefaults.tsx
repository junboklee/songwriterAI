import Head from 'next/head';
import { useRouter } from 'next/router';

import SEO from '@/next-seo.config';

// Site-wide defaults. The canonical URL and og:url follow the current path (without the query),
// so each page is its own search result; a page can override them by reusing the same `key`.
export default function SeoDefaults() {
  const router = useRouter();
  const path = (router.asPath || '/').split(/[?#]/)[0];
  const pageUrl = `${SEO.siteUrl}${path === '/' ? '' : path}`;

  return (
    <Head>
      <title key="title">{SEO.defaultTitle}</title>
      <meta key="description" name="description" content={SEO.description} />
      <link key="canonical" rel="canonical" href={pageUrl} />
      <meta key="og:site_name" property="og:site_name" content={SEO.openGraph.siteName} />
      <meta key="og:type" property="og:type" content={SEO.openGraph.type} />
      <meta key="og:url" property="og:url" content={pageUrl} />
      <meta key="og:locale" property="og:locale" content={SEO.openGraph.locale} />
      <meta key="og:description" property="og:description" content={SEO.openGraph.description} />
      <meta key="twitter:card" name="twitter:card" content={SEO.twitter.cardType} />
    </Head>
  );
}
