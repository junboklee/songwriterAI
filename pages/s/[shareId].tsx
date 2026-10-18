import type { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';

import { AI_SHARE_LABEL, HUMAN_SHARE_LABEL } from '@/lib/aiDisclosure';
import { toMusicToolFormat } from '@/lib/lyricsFormat';

const SITE_URL = 'https://novasingerai.com';

type SharedSongProps = {
  shareId: string;
  title: string | null;
  lyrics: string;
  style: string | null;
  aiAssisted: boolean;
};

const SECTION_TAG = /^\[[^\]]*\]$/;

export const getServerSideProps: GetServerSideProps<SharedSongProps> = async ({ params, res }) => {
  const shareId = typeof params?.shareId === 'string' ? params.shareId : '';
  // Imported lazily so building the page does not require Firebase Admin credentials.
  const [{ adminDb }, { SHARED_SONGS_COLLECTION }] = await Promise.all([
    import('@/lib/firebaseAdmin'),
    import('@/lib/songVersions')
  ]);
  const snapshot = shareId
    ? await adminDb.collection(SHARED_SONGS_COLLECTION).doc(shareId).get()
    : null;

  if (!snapshot?.exists) {
    return { notFound: true };
  }

  const data = snapshot.data() ?? {};
  // Never cache at the CDN: un-sharing or deleting a song must take effect immediately.
  res.setHeader('Cache-Control', 'private, no-store');

  return {
    props: {
      shareId,
      title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : null,
      lyrics: typeof data.lyrics === 'string' ? data.lyrics : '',
      style: typeof data.style === 'string' && data.style.trim() ? data.style.trim() : null,
      // Shares made before this field existed came from chats.
      aiAssisted: data.aiAssisted !== false
    }
  };
};

export default function SharedSongPage({ shareId, title, lyrics, style, aiAssisted }: SharedSongProps) {
  const [copied, setCopied] = useState(false);
  const displayTitle = title ?? '제목 없는 노래';
  const preview = lyrics
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !SECTION_TAG.test(line))
    .slice(0, 3)
    .join(' / ');
  const pageUrl = `${SITE_URL}/s/${shareId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(toMusicToolFormat({ title, body: lyrics, style }));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <Head>
        <title>{`${displayTitle} | NovaSingerAI`}</title>
        <meta name="description" content={preview} />
        {/* Shared by link only; keep these pages out of search results. */}
        <meta name="robots" content="noindex" />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={`${displayTitle} — NovaSingerAI`} />
        <meta property="og:description" content={preview} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={`${SITE_URL}/api/og/song/${shareId}`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        {/* Machine-readable AI-generation label (AI Basic Act); the visible label is on the page. */}
        {aiAssisted ? <meta name="ai-generated" content="true" /> : null}
      </Head>

      <main className="shared-song">
        <article className="shared-song__card">
          <p className="shared-song__eyebrow">{aiAssisted ? AI_SHARE_LABEL : HUMAN_SHARE_LABEL}</p>
          <h1>{displayTitle}</h1>
          {style ? <p className="shared-song__style">🎚 {style}</p> : null}

          <div className="shared-song__lyrics">
            {lyrics.split(/\r?\n/).map((line, index) =>
              SECTION_TAG.test(line.trim()) ? (
                <p key={index} className="shared-song__section">
                  {line.trim().slice(1, -1)}
                </p>
              ) : (
                <p key={index}>{line || ' '}</p>
              )
            )}
          </div>

          <div className="shared-song__actions">
            <button type="button" className="btn btn--ghost" onClick={() => void handleCopy()}>
              {copied ? '복사됨 ✓' : '가사 복사 (Suno 형식)'}
            </button>
            <Link href="/" className="btn btn--primary">
              나도 AI와 가사 쓰기
            </Link>
          </div>
        </article>
      </main>

      <style jsx>{`
        .shared-song {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          padding: 48px 16px 64px;
        }

        .shared-song__card {
          width: min(640px, 100%);
          display: grid;
          gap: 16px;
          align-content: start;
        }

        .shared-song__eyebrow {
          margin: 0;
          font-size: 0.8rem;
          letter-spacing: 0.04em;
          color: var(--text-secondary);
        }

        h1 {
          margin: 0;
          font-size: clamp(1.6rem, 5vw, 2.2rem);
        }

        .shared-song__style {
          margin: 0;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .shared-song__lyrics {
          padding: 24px;
          border-radius: 20px;
          border: 1px solid var(--card-border);
          background: rgba(255, 255, 255, 0.03);
          line-height: 1.8;
        }

        .shared-song__lyrics p {
          margin: 0;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .shared-song__lyrics .shared-song__section {
          margin-top: 14px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #a78bfa;
        }

        .shared-song__lyrics .shared-song__section:first-child {
          margin-top: 0;
        }

        .shared-song__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
      `}</style>
    </>
  );
}
