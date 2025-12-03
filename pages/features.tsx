import Head from 'next/head';
import Link from 'next/link';

const features = [
  {
    title: '캐릭터 기반 작사',
    description: '장르, 시대, 감성에 맞는 AI 캐릭터를 선택해 메시지 톤을 즉시 맞출 수 있습니다.'
  },
  {
    title: '실시간 대화형 워크플로우',
    description: '이전에 대화하며 수정한 가사 내용들이 저장되어 언제든 살펴볼 수 있어요.'
  },
  {
    title: '곡 단위 버전 관리',
    description: '노래마다 가사 버전을 저장하고 메타데이터와 참조 음원을 남겨 팀과 공유합니다.'
  }
];

export default function FeaturesPage() {
  return (
    <>
      <Head>
        <title>주요 기능 | SongwriterAI</title>
        <meta
          name="description"
          content="SongwriterAI의 캐릭터 기반 작사, 실시간 워크플로우, 곡 단위 버전 관리 기능을 확인하세요."
        />
        <meta property="og:title" content="주요 기능 | SongwriterAI" />
        <meta
          property="og:description"
          content="캐릭터 기반 AI 작사, 대화형 워크플로우, 버전 관리 기능을 살펴보세요."
        />
      </Head>
      <div className="features-bg">
        <main className="page">
          <header>
            <p className="eyebrow">Features</p>
            <h1>작사 과정을 단축시키는 주요 기능</h1>
            <p>
              SongwriterAI는 아이디어 발상, 톤 조절, 아카이빙을 하나의 뷰에서 처리할 수 있도록 설계했습니다.
              아래 기능을 활용해 개인 작업 속도를 높이고 팀 협업을 간소화하세요.
            </p>
          </header>

          <section className="grid">
            {features.map((feature) => (
              <article key={feature.title}>
                <h2>{feature.title}</h2>
                <p>{feature.description}</p>
              </article>
            ))}
          </section>

          <section className="cta">
            <h2>모든 기능을 무료로 체험해 보세요</h2>
            <p>가입 후 즉시 AI 작사가와 대화하며 위 기능을 경험할 수 있습니다.</p>
            <div className="cta-buttons">
              <Link href="/auth/login" className="primary">
                무료로 시작하기
              </Link>
              <Link href="/" className="secondary">
                뒤로 가기
              </Link>
            </div>
          </section>
        </main>
      </div>

      <style jsx>{`
        .features-bg {
          min-height: 100vh;
          background: #0f1015;
          padding: 4rem 0 5rem;
        }

        .page {
          max-width: 900px;
          margin: 0 auto;
          padding: 4rem 1.5rem 6rem;
          color: #f1f5f9;
        }

        header {
          text-align: center;
        }

        .eyebrow {
          letter-spacing: 0.25rem;
          text-transform: uppercase;
          color: #8f7dff;
          margin-bottom: 0.75rem;
          display: inline-block;
        }

        .grid {
          margin-top: 3rem;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
        }

        article {
          padding: 1.75rem;
          border: 1px solid rgba(148, 163, 184, 0.35);
          border-radius: 1.25rem;
          background: radial-gradient(circle at top, rgba(99, 102, 241, 0.2), rgba(15, 23, 42, 0.9));
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.45);
        }

        .cta {
          margin-top: 4rem;
          text-align: center;
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 1.5rem;
          padding: 3rem 1.5rem;
          background: radial-gradient(circle at top, rgba(99, 102, 241, 0.25), rgba(15, 23, 42, 0.92));
        }

        .cta-buttons {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
          justify-content: center;
        }

        .cta-buttons a {
          padding: 0.9rem 1.75rem;
          border-radius: 999px;
          font-weight: 600;
          text-decoration: none;
        }

        .cta-buttons .primary {
          background: linear-gradient(120deg, #7c3aed, #6366f1);
          color: #fff;
        }

        .cta-buttons .secondary {
          border: 1px solid rgba(226, 232, 240, 0.4);
          color: #e2e8f0;
        }
      `}</style>
    </>
  );
}
