import Head from 'next/head';
import SEO from '@/next-seo.config';

export default function SeoDefaults() {
  return (
    <Head>
      <title>{SEO.defaultTitle}</title>
      <meta name="description" content={SEO.description} />
      <link rel="canonical" href={SEO.canonical} />
      <meta property="og:site_name" content={SEO.openGraph.siteName} />
      <meta property="og:type" content={SEO.openGraph.type} />
      <meta property="og:url" content={SEO.openGraph.url} />
      <meta property="og:locale" content={SEO.openGraph.locale} />
      <meta property="og:description" content={SEO.openGraph.description} />
      <meta property="twitter:card" content={SEO.twitter.cardType} />
      <meta property="twitter:site" content={SEO.twitter.site} />
      <meta property="twitter:creator" content={SEO.twitter.handle} />
    </Head>
  );
}
