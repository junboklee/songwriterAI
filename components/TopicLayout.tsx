import Head from 'next/head';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { pageCardPath } from '@/lib/ogPageCard';

const SITE_URL = 'https://novasingerai.com';

type TopicLayoutProps = {
  title: string;
  description: string;
  // Site path of the page ('/lyrics' or '/lyrics/{slug}'), for the canonical URL.
  path: string;
  // Slug of the link-preview card (see lib/ogPageCard).
  card: string;
  jsonLd?: Record<string, unknown>;
  children: ReactNode;
};

// Public, indexable content pages (/lyrics/*): readable column, site nav and a sign-up path.
export function TopicLayout({ title, description, path, card, jsonLd, children }: TopicLayoutProps) {
  const url = `${SITE_URL}${path}`;
  return (
    <>
      <Head>
        <title key="title">{`${title} | NovaSingerAI`}</title>
        <meta key="description" name="description" content={description} />
        <meta key="og:title" property="og:title" content={`${title} | NovaSingerAI`} />
        <meta key="og:description" property="og:description" content={description} />
        <meta key="og:type" property="og:type" content="article" />
        <meta key="og:url" property="og:url" content={url} />
        <meta key="og:site_name" property="og:site_name" content="NovaSingerAI" />
        <meta key="og:image" property="og:image" content={`${SITE_URL}${pageCardPath(card)}`} />
        <meta key="og:image:width" property="og:image:width" content="1200" />
        <meta key="og:image:height" property="og:image:height" content="630" />
        <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
        <link key="canonical" rel="canonical" href={url} />
        {jsonLd ? (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        ) : null}
      </Head>
      <main className="topic-page">
        <nav className="topic-page__nav">
          <Link href="/">← NovaSingerAI</Link>
          <Link href="/lyrics">주제별 가사 만들기</Link>
        </nav>
        {children}
      </main>
      <style jsx>{`
        .topic-page {
          max-width: 760px;
          margin: 0 auto;
          padding: 40px 16px 80px;
          line-height: 1.8;
        }
        .topic-page__nav {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 0.9rem;
          margin-bottom: 32px;
        }
        .topic-page :global(h1) {
          margin: 0 0 12px;
          font-size: clamp(1.6rem, 4vw, 2.1rem);
          line-height: 1.3;
        }
        .topic-page :global(h2) {
          margin: 40px 0 12px;
          font-size: 1.2rem;
        }
        .topic-page :global(.topic-lead) {
          color: var(--text-secondary);
          font-size: 1.02rem;
        }
        .topic-page :global(.topic-sample) {
          padding: 20px 24px;
          border-radius: 18px;
          border: 1px solid var(--card-border, var(--divider));
          background: rgba(255, 255, 255, 0.03);
          white-space: pre-wrap;
        }
        .topic-page :global(.topic-cta) {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin: 28px 0;
        }
        .topic-page :global(dt) {
          font-weight: 700;
          margin-top: 16px;
        }
        .topic-page :global(dd) {
          margin: 4px 0 0;
          color: var(--text-secondary);
        }
      `}</style>
    </>
  );
}
