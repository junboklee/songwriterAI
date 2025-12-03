import Head from 'next/head';
import Link from 'next/link';

const sections = [
  {
    title: 'AI와 음악가의 협업',
    body: 'SongwriterAI는 아이디어 스케치부터 완성 가사까지 한 번에 도와주는 작사 코파일럿입니다. 캐릭터별로 말투를 설정해 한줄 멜로디에서도 감성 가사를 뽑아낼 수 있어요.'
  },
  {
    title: '실시간 대화형 워크플로',
    body: '대화를 이어가며 가사를 수정하고, 버전 히스토리를 보면서 더 좋았던 표현을 언제든 되돌릴 수 있습니다. 모든 기록은 안전하게 클라우드에 저장됩니다.'
  },
  {
    title: '완성곡 관리',
    body: '영감이 떠오를 때 바로 스케치하고, 노래별 메타데이터를 정리해 팀원과 공유하거나 라이브 세션용으로 활용하세요.'
  }
];

const faqs = [
  {
    q: '누가 사용할 수 있나요?',
    a: '초보 작사가부터 프로듀서까지, 가사 아이디어가 필요한 누구나 무료로 가입할 수 있습니다.'
  },
  {
    q: '데이터는 안전한가요?',
    a: 'Firebase Authentication과 Firestore를 사용해 사용자별로 데이터를 분리 저장하며, 언제든 삭제를 요청할 수 있습니다.'
  },
  {
    q: '언어는 어떤 것을 지원하나요?',
    a: '한국어/영어 인터페이스를 기본으로 제공하고, 추가 언어를 순차적으로 확장할 예정입니다.'
  }
];

export default function Home() {
  return (
    <>
      <Head>
        <title>SongwriterAI | AI 작사가 서비스</title>
        <meta
          name="description"
          content="AI와 대화하며 가사를 완성하고 버전을 관리하세요. SongwriterAI로 영감을 빠르게 기록하고 노래 제작 속도를 높이세요."
        />
        <meta property="og:title" content="SongwriterAI" />
        <meta
          property="og:description"
          content="AI 작사가와 협업해 더 빠르게 노래를 완성하세요."
        />
        <meta property="og:type" content="website" />
      </Head>
      <main className="landing">
        <section className="hero">
          <p className="eyebrow">AI Songwriting Copilot</p>
          <h1>영감이 올 때, AI가 바로 가사를 완성해 드립니다</h1>
          <p>
            SongwriterAI는 OpenAI 어시스턴트와 실시간으로 대화하며 곡 흐름을 잡고,
            캐릭터 기반 톤 조절로 다양한 분위기의 가사를 만드는 워크플로를 제공합니다.
          </p>
          <div className="cta">
            <Link href="/auth/login">무료로 시작하기</Link>
            <Link href="/features" className="secondary">
              기능 살펴보기
            </Link>
          </div>
        </section>

        <section className="grid">
          {sections.map((section) => (
            <article key={section.title}>
              <h2>{section.title}</h2>
              <p>{section.body}</p>
            </article>
          ))}
        </section>

        <section className="workflow">
          <h2>3단계 작사 워크플로</h2>
          <ol>
            <li>
              <strong>캐릭터 선택</strong> – 장르/톤에 맞는 캐릭터를 고르고 한줄 프롬프트를 입력합니다.
            </li>
            <li>
              <strong>대화로 수정</strong> – 마음에 드는 표현이 나올 때까지 메시지를 주고받으며 다듬습니다.
            </li>
            <li>
              <strong>버전 저장</strong> – 완성본을 노래별로 저장하고 메타데이터를 추가합니다.
            </li>
          </ol>
        </section>

        <section className="faq">
          <h2>자주 묻는 질문</h2>
          {faqs.map((faq) => (
            <article key={faq.q}>
              <h3>{faq.q}</h3>
              <p>{faq.a}</p>
            </article>
          ))}
        </section>

        <section className="cta-banner">
          <h2>지금 바로 AI 작사가와 대화를 시작해 보세요</h2>
          <p>회원가입은 1분이면 충분합니다. 무료 체험으로 작사 시간을 절약하세요.</p>
          <div className="cta">
            <Link href="/auth/login">로그인 / 가입</Link>
            <Link href="/pricing" className="secondary">
              요금제 보기
            </Link>
          </div>
        </section>
      </main>

      <style jsx>{`
        .landing {
          padding: 4rem 1.5rem 6rem;
          max-width: 960px;
          margin: 0 auto;
          font-family: 'Segoe UI', sans-serif;
        }

        .hero {
          text-align: center;
          margin-bottom: 4rem;
        }

        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.3rem;
          font-size: 0.85rem;
          color: #8f7dff;
          margin-bottom: 1rem;
        }

        h1 {
          font-size: clamp(2rem, 5vw, 3.25rem);
          margin-bottom: 1rem;
        }

        .hero p {
          font-size: 1.1rem;
          color: #4b5563;
        }

        .cta {
          margin-top: 2rem;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 1rem;
        }

        .cta a {
          padding: 0.9rem 1.5rem;
          border-radius: 999px;
          font-weight: 600;
          text-decoration: none;
          color: #fff;
          background: linear-gradient(120deg, #7c3aed, #6366f1);
        }

        .cta a.secondary {
          background: none;
          color: #4b5563;
          border: 1px solid #e5e7eb;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
          margin-bottom: 4rem;
        }

        .grid article {
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 1rem;
          background: #fff;
        }

        .workflow,
        .faq,
        .cta-banner {
          margin-bottom: 4rem;
        }

        ol {
          padding-left: 1.1rem;
          color: #4b5563;
        }

        .faq article {
          border-bottom: 1px solid #e5e7eb;
          padding: 1rem 0;
        }

        .cta-banner {
          background: radial-gradient(circle at top, rgba(124, 58, 237, 0.1), transparent);
          border: 1px solid #e5e7eb;
          border-radius: 1.5rem;
          text-align: center;
          padding: 3rem 1.5rem;
        }

        @media (prefers-color-scheme: dark) {
          .landing {
            color: #f3f4f6;
          }

          .hero p,
          p,
          li {
            color: #d1d5db;
          }

          .grid article,
          .faq article,
          .cta-banner {
            border-color: rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.02);
          }

          .cta a.secondary {
            border-color: rgba(255, 255, 255, 0.2);
            color: #f3f4f6;
          }
        }
      `}</style>
    </>
  );
}
