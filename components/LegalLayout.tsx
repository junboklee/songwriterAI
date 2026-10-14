import Head from 'next/head';
import Link from 'next/link';
import type { ReactNode } from 'react';

type LegalLayoutProps = {
  title: string;
  effectiveDate: string;
  description: string;
  children: ReactNode;
};

// Shared shell for /terms and /privacy: readable single column, links between the documents.
export function LegalLayout({ title, effectiveDate, description, children }: LegalLayoutProps) {
  return (
    <>
      <Head>
        <title>{`${title} | NovaSingerAI`}</title>
        <meta name="description" content={description} />
      </Head>
      <main className="legal-page">
        <nav className="legal-page__nav">
          <Link href="/">← NovaSingerAI</Link>
          <span>
            <Link href="/terms">이용약관</Link> · <Link href="/privacy">개인정보처리방침</Link>
          </span>
        </nav>
        <h1>{title}</h1>
        <p className="legal-page__date">시행일: {effectiveDate}</p>
        <div className="legal-page__body">{children}</div>
      </main>

      <style jsx>{`
        .legal-page {
          max-width: 760px;
          margin: 0 auto;
          padding: 40px 16px 80px;
          line-height: 1.75;
        }

        .legal-page__nav {
          display: flex;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 0.9rem;
          margin-bottom: 32px;
        }

        h1 {
          margin: 0 0 6px;
          font-size: clamp(1.6rem, 4vw, 2rem);
        }

        .legal-page__date {
          margin: 0 0 32px;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .legal-page__body :global(h2) {
          margin: 36px 0 10px;
          font-size: 1.15rem;
        }

        .legal-page__body :global(ul),
        .legal-page__body :global(ol) {
          padding-left: 1.3rem;
        }

        .legal-page__body :global(table) {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.88rem;
          display: block;
          overflow-x: auto;
        }

        .legal-page__body :global(th),
        .legal-page__body :global(td) {
          border: 1px solid var(--divider);
          padding: 8px 10px;
          text-align: left;
          vertical-align: top;
        }
      `}</style>
    </>
  );
}
