import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

const highlights = [
  {
    title: '캐릭터 만들기',
    body: '장르와 감정을 캐릭터에 저장해 두면 대화를 시작할 때마다 어울리는 표현을 자동으로 제안받습니다.'
  },
  {
    title: '대화형 편집',
    body: '피드백을 주고받으며 구절을 다듬고, 마음에 드는 버전만 즉시 저장하거나 공유할 수 있어요.'
  },
  {
    title: '가사 보관 아카이브',
    body: '대화 기록과 곡 초안이 자동 정리되어 언제든 이전 가사 버전을 비교·복원할 수 있습니다.'
  },
  {
    title: '데이터 안심 보관',
    body: '시스템 인증과 보안 규칙으로 다른 사용자와 데이터가 섞이지 않도록 완전히 분리해 보관합니다.'
  }
];

const faqs = [
  {
    q: '누가 사용할 수 있나요?',
    a: '입문자부터 프로 작사가까지 모두 무료로 체험할 수 있으며, 대화 데이터는 본인 계정에만 저장됩니다.'
  },
  {
    q: '데이터는 안전한가요?',
    a: '시스템 인증과 보안 규칙으로 다른 사람이 내 대화·캐릭터·곡 초안을 볼 수 없습니다.'
  },
  {
    q: '어떤 언어를 지원하나요?',
    a: '현재 한국어와 영어 UI를 제공하며, 대화 모델은 여러 언어를 이해하고 자연스럽게 작성할 수 있도록 튜닝되어 있습니다.'
  }
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <Head>
        <title>NovaSingerAI | AI 송라이팅 코파일럿</title>
        <meta
          name="description"
          content="AI작사가와 협업하며 가사를 실시간으로 만들고 가사를 보관하는 가장 간단한 워크플로우."
        />
        <meta property="og:title" content="NovaSingerAI" />
        <meta
          property="og:description"
          content="아이디어부터 완성본까지 AI캐릭터와 함께 작사 작업을 경험해 보세요."
        />
      </Head>
      <div className="landing-bg">
        <main className="landing">
          <section className="hero">
            <div className="hero-image">
              <p className="hero-eyebrow">AI Songwriting Copilot</p>
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
                아이디어부터 완성본까지
                <span>AI와 함께 쓰는 송라이팅</span>
              </h1>
              <p>
                NovaSingerAI는 캐릭터 중심 대화형 인터페이스로 감정·콘셉트·상황을 빠르게 정의하고, 마음에 드는 가사를
                버전별로 보관할 수 있는 송라이팅 코파일럿입니다.
              </p>
              <div className="hero-cta">
                <Link href="/auth/login" className="cta primary">
                  <div className="cta-card">
                    <span className="cta-label">무료로 시작하기</span>
                  </div>
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

          <section className="workflow">
            <h2>3단계 제작 흐름</h2>
            <div className="workflow-grid">
              <article>
                <span className="badge">STEP 01</span>
                <h3>캐릭터 선택</h3>
                <p>곡 분위기에 맞는 캐릭터를 고르고 프롬프트를 입력해 대화를 시작합니다.</p>
              </article>
              <article>
                <span className="badge">STEP 02</span>
                <h3>대화형 편집</h3>
                <p>피드백을 주고받으며 구절을 다듬고, 마음에 드는 답만 골라 저장합니다.</p>
              </article>
              <article>
                <span className="badge">STEP 03</span>
                <h3>가사 보관·공유</h3>
                <p>완성본을 곡 초안으로 저장하거나 카드 형태로 팀과 공유하세요.</p>
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
            <Link href="/auth/login" className="cta primary">
              <div className="cta-card">
                <span className="cta-label">무료로 시작하기</span>
              </div>
            </Link>
          </section>
        </main>
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
        }

        .hero-copy h1 {
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
          gap: 1.25rem;
          flex-wrap: wrap;
          justify-content: center;
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
