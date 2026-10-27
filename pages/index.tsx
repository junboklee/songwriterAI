import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { LYRICS_TOPICS } from '@/lib/lyricsTopics';

const highlights = [
  {
    title: '이야기하면 가사가 돼요',
    body: 'AI 싱어송라이터 Dayeon에게 오늘 있었던 일이나 전하고 싶은 마음을 이야기하면 노래 가사와 음악 스타일로 만들어 줘요.'
  },
  {
    title: '부르기 좋은 한국어',
    body: '가창성 검사가 줄 길이, 숫자, 끊기는 받침처럼 노래로 부르기 어려운 곳을 찾아 주고, 그 줄만 AI로 다시 쓸 수 있어요.'
  },
  {
    title: 'Suno에 바로',
    body: '가사와 스타일을 따로 복사해 Suno 같은 AI 음악 도구에 붙여 넣기만 하면 노래가 돼요.'
  },
  {
    title: '버전과 창작 기록',
    body: '고칠 때마다 버전이 남고, 최종 가사의 어느 줄을 내가 썼는지 창작 기록으로 확인하고 내보낼 수 있어요.'
  }
];

const faqs = [
  {
    q: '노래(음원)까지 만들어 주나요?',
    a: 'NovaSingerAI는 가사와 음악 스타일 문구를 만들어 줘요. 이 내용을 Suno 같은 AI 음악 도구에 붙여 넣으면 노래로 만들 수 있어요.'
  },
  {
    q: '무료인가요?',
    a: '베타 기간에는 매달 300회까지 무료로 AI와 대화할 수 있어요.'
  },
  {
    q: '만든 가사는 누구 것인가요?',
    a: '내가 만든 가사에 대한 권리는 관련 법령이 허용하는 범위에서 나에게 있어요. 다만 AI만으로 만든 결과물은 저작권 보호를 받지 못할 수 있어, 직접 고친 부분을 창작 기록으로 남겨 두는 걸 권해요.'
  },
  {
    q: '내 대화와 가사는 안전한가요?',
    a: '대화와 가사는 내 계정에만 저장되고, 직접 공유 링크를 만들 때만 가사가 공개돼요. 대화 내용을 AI 학습에 쓰지 않아요.'
  },
  {
    q: '누가 쓸 수 있나요?',
    a: '만 19세 이상이면 누구나 쓸 수 있어요. 작사를 처음 해 보는 분도 이야기만 하면 돼요.'
  }
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <Head>
        <title key="title">NovaSingerAI | AI 작사·노래 가사 만들기</title>
        <meta
          key="description"
          name="description"
          content="AI 싱어송라이터와 대화하면 오늘의 이야기가 노래 가사가 돼요. 생일 노래, 축가, 고백 노래 가사를 만들고 Suno 같은 AI 음악 도구에 바로 쓰세요."
        />
        <meta key="og:title" property="og:title" content="NovaSingerAI | AI 작사·노래 가사 만들기" />
        <meta
          key="og:description"
          property="og:description"
          content="아이디어부터 완성본까지 AI 캐릭터와 함께 작사 작업을 경험해 보세요."
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'NovaSingerAI',
              url: 'https://novasingerai.com',
              applicationCategory: 'MusicApplication',
              operatingSystem: 'Web',
              inLanguage: 'ko',
              description: 'AI 싱어송라이터 캐릭터와 대화하며 노래 가사를 만들고 다듬는 웹 서비스',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
              publisher: { '@type': 'Organization', name: '주식회사 콜드브러시' }
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqs.map(item => ({
                '@type': 'Question',
                name: item.q,
                acceptedAnswer: { '@type': 'Answer', text: item.a }
              }))
            })
          }}
        />
      </Head>
      <div className="landing-bg">
        <main className="landing">
          <section className="hero">
            <div className="hero-image">
              <p className="hero-eyebrow">AI Singer-Songwriter</p>
              <Image
                src="/images/auth-hero.jpg"
                alt="AI 작사가와 협업 중인 뮤지션"
                width={1920}
                height={1080}
                priority
              />
            </div>
            <div className="hero-copy">
              <h1>
                오늘 하루가 노래가 되는 곳
                <span>AI 싱어송라이터와 함께 쓰는 한국어 가사</span>
              </h1>
              <p>
                Dayeon에게 오늘 있었던 일을 이야기해 보세요. 부르기 좋은 한국어 가사와 음악 스타일로 만들어 드려요.
                완성한 가사는 Suno 같은 AI 음악 도구에 붙여 넣기만 하면 노래가 됩니다.
              </p>
              <div className="hero-cta">
                <Link href="/try?from=landing" className="cta primary">
                  <div className="cta-card">
                    <span className="cta-label">가입 없이 바로 써 보기</span>
                  </div>
                </Link>
                <Link href="/auth/register" className="hero-login">
                  무료로 가입하기
                </Link>
                <Link href="/auth/login" className="hero-login">
                  이미 계정이 있어요 · 로그인
                </Link>
              </div>
            </div>
          </section>

          <section className="highlight-grid">
            {highlights.map(item => (
              <article key={item.title}>
                <h2>{item.title}</h2>
                <p>{item.body}</p>
              </article>
            ))}
          </section>

          <section className="topics">
            <h2>어떤 노래를 만들까요?</h2>
            <p>상황을 고르면 만드는 방법과 예시 가사를 볼 수 있어요.</p>
            <div className="topic-chips">
              {LYRICS_TOPICS.map(topic => (
                <Link key={topic.slug} href={`/lyrics/${topic.slug}`} className="topic-chip">
                  {topic.title.replace(/ 가사 (만들기|쓰기)$/, '')}
                </Link>
              ))}
            </div>
          </section>

          <section className="workflow">
            <h2>3단계 제작 흐름</h2>
            <div className="workflow-grid">
              <article>
                <span className="badge">STEP 01</span>
                <h3>이야기하기</h3>
                <p>누구에게 어떤 마음을 전하고 싶은지 Dayeon이나 마음에 드는 캐릭터에게 이야기해요.</p>
              </article>
              <article>
                <span className="badge">STEP 02</span>
                <h3>다듬기</h3>
                <p>가창성 검사로 부르기 어려운 곳을 찾고, 마음에 들지 않는 줄만 골라 AI로 다시 써요.</p>
              </article>
              <article>
                <span className="badge">STEP 03</span>
                <h3>노래로 만들고 나누기</h3>
                <p>Suno에 붙여 넣어 노래로 만들고, 카카오톡이나 스토리 이미지로 공유해요.</p>
              </article>
            </div>
          </section>

          <section className="faq">
            <h2>자주 묻는 질문</h2>
            {faqs.map((item, index) => {
              const isOpen = openFaq === index;
              return (
                <article key={item.q} className={`faq-item${isOpen ? ' open' : ''}`}>
                  <button
                    type="button"
                    className="faq-header"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    aria-expanded={isOpen}
                  >
                    <span>{item.q}</span>
                    <span aria-hidden>{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen ? (
                    <div className="faq-body">
                      <p>{item.a}</p>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>

          <section className="bottom-cta">
            <p className="poster-eyebrow">NOW LIVE</p>
            <h2>지금 바로 NovaSingerAI를 체험해 보세요</h2>
            <Link href="/try?from=landing" className="cta primary">
              <div className="cta-card">
                <span className="cta-label">가입 없이 바로 써 보기</span>
              </div>
            </Link>
          </section>
        </main>
        <footer className="landing-footer">
          <Link href="/lyrics">주제별 가사 만들기</Link>
          <Link href="/pricing">요금 안내</Link>
          <Link href="/terms">이용약관</Link>
          <Link href="/privacy">
            <strong>개인정보처리방침</strong>
          </Link>
          <Link href="/safety">안전 정책</Link>
          <span>© NovaSingerAI</span>
        </footer>
      </div>

      <style jsx>{`
        .landing-bg {
          min-height: 100vh;
          background: linear-gradient(180deg, #050710 0%, #0f172a 45%, #020309 100%);
          color: #f8fafc;
        }

        .landing {
          max-width: 960px;
          margin: 0 auto;
          padding: 4rem 1.5rem 5rem;
          display: flex;
          flex-direction: column;
          gap: 3rem;
        }

        .hero {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          text-align: center;
        }

        .hero-image {
          text-align: center;
        }

        .hero-image :global(img) {
          width: 100%;
          height: auto;
          border-radius: 1.5rem;
          object-fit: cover;
        }

        .hero-eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.35rem;
          font-size: 0.8rem;
          color: #a5b4fc;
          margin-bottom: 0.8rem;
          display: inline-block;
        }

        .hero-copy {
          max-width: 720px;
          margin: 0 auto;
          text-align: center;
          /* Break Korean lines between words, not inside them. */
          word-break: keep-all;
        }

        .hero-copy h1 {
          /* Even line lengths so a single word is never left alone on the last line. */
          text-wrap: balance;
          font-size: clamp(2.2rem, 4vw, 3.1rem);
          line-height: 1.2;
          margin: 0 0 1rem;
        }

        .hero-copy h1 span {
          display: block;
          color: #c4b5fd;
          margin-top: 0.35rem;
        }

        .hero-copy p {
          color: #d1d5db;
          line-height: 1.6;
          margin: 0 0 2rem;
        }

        .hero-cta {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .cta {
          text-decoration: none;
        }

        .cta.primary .cta-card {
          padding: 1.4rem 2.6rem;
          border-radius: 1.5rem;
          font-weight: 700;
          background: linear-gradient(120deg, #f472b6, #6366f1);
          color: #fff;
          box-shadow: 0 30px 70px rgba(99, 102, 241, 0.45);
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .cta-label {
          font-size: 2rem;
          letter-spacing: 0.02em;
        }

        .cta-desc {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.85);
        }

        .cta.primary:hover .cta-card {
          transform: translateY(-3px);
          box-shadow: 0 35px 80px rgba(99, 102, 241, 0.5);
        }

        .highlight-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
        }

        .highlight-grid article {
          padding: 1.25rem;
          border-radius: 1.25rem;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(15, 23, 42, 0.7);
        }

        .workflow {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .hero-login {
          display: inline-block;
          margin-top: 12px;
          font-size: 0.9rem;
          color: rgba(226, 232, 240, 0.75);
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        .topics p {
          margin: 0.5rem 0 1rem;
          color: rgba(226, 232, 240, 0.75);
        }

        .topic-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        .topic-chips :global(.topic-chip) {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid rgba(196, 181, 253, 0.35);
          background: rgba(167, 139, 250, 0.08);
          color: #e9e5ff;
          font-size: 0.92rem;
          text-decoration: none;
        }

        .topic-chips :global(.topic-chip:hover) {
          background: rgba(167, 139, 250, 0.2);
        }

        .workflow-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
        }

        .workflow-grid article {
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 1rem;
          padding: 1.5rem;
          background: rgba(15, 23, 42, 0.75);
        }

        .badge {
          font-size: 0.75rem;
          letter-spacing: 0.3rem;
          text-transform: uppercase;
          display: inline-block;
          margin-bottom: 0.5rem;
          color: #c4b5fd;
        }

        .faq h2 {
          margin-bottom: 1rem;
          text-align: center;
        }

        .faq-item {
          border: 1px solid rgba(148, 163, 184, 0.25);
          border-radius: 1rem;
          background: rgba(15, 23, 42, 0.7);
          margin-bottom: 0.75rem;
          overflow: hidden;
        }

        .faq-header {
          width: 100%;
          border: none;
          background: transparent;
          color: inherit;
          font-size: 1rem;
          font-weight: 600;
          padding: 1rem 1.2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        }

        .faq-body {
          padding: 0 1.2rem 1rem;
          color: #d1d5db;
        }

        .landing-footer {
          max-width: 960px;
          margin: 0 auto;
          padding: 0 1.5rem 3rem;
          display: flex;
          flex-wrap: wrap;
          gap: 1.25rem;
          font-size: 0.85rem;
          color: #94a3b8;
        }

        .landing-footer :global(a) {
          color: inherit;
        }

        .bottom-cta {
          text-align: center;
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 1.5rem;
          padding: 2.5rem 1.5rem;
          background: radial-gradient(circle at top, rgba(99, 102, 241, 0.25), rgba(15, 23, 42, 0.9));
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: center;
        }

        .poster-eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.3rem;
          font-size: 0.8rem;
          color: #c4b5fd;
        }

        @media (min-width: 900px) {
          .highlight-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 640px) {
          .hero-cta {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}
