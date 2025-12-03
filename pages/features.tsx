import Head from 'next/head';
import Link from 'next/link';

const features = [
  {
    title: '캐릭터 기반 작사',
    description: '장르, 시대, 감성에 맞춘 AI 캐릭터를 선택해 메시지 톤을 바로 맞출 수 있습니다.'
  },
  {
    title: '대화형 히스토리',
    description: '대화를 이어가며 수정한 내역이 실시간으로 스레드에 저장되어 언제든 되돌릴 수 있어요.'
  },
  {
    title: '곡 단위 버전 관리',
    description: '노래마다 가사 버전을 저장하고 메타데이터와 참조 음원을 남겨 팀과 공유합니다.'
  },
  {
    title: 'Suno / Character 기반 연동',
    description: '외부 모델과 연동하여 멜로디 흐름이나 캐릭터 설정을 손쉽게 가져옵니다.'
  }
];

export default function FeaturesPage() {
  return (
    <>
      <Head>
        <title>주요 기능 | SongwriterAI</title>
        <meta
          name="description"
          content="SongwriterAI의 캐릭터 기반 작사, 대화형 히스토리, 버전 관리 기능을 확인하세요."
        />
        <meta property="og:title" content="주요 기능 | SongwriterAI" />
        <meta
          property="og:description"
          content="캐릭터 기반 AI 작사, 대화형 히스토리, 버전 관리 기능을 살펴보세요."
        />
      </Head>
      <main className="page">
        <header>
          <p className="eyebrow">Features</p>
          <h1>작사 과정을 단축시키는 주요 기능</h1>
          <p>
            SongwriterAI는 아이디어 발상, 톤 조절, 아카이빙을 하나의 뷰에서 처리할 수 있도록 설계되었습니다.
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
          <Link href="/auth/login">무료로 시작하기</Link>
        </section>
      </main>

      <style jsx>{`
        .page {
          max-width: 900px;
          margin: 0 auto;
          padding: 4rem 1.5rem 6rem;
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
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
          border-radius: 1rem;
        }

        .cta {
          margin-top: 4rem;
          text-align: center;
          border: 1px solid #e5e7eb;
          border-radius: 1.5rem;
          padding: 3rem 1.5rem;
        }

        .cta a {
          display: inline-block;
          margin-top: 1rem;
          padding: 0.9rem 1.5rem;
          border-radius: 999px;
          background: linear-gradient(120deg, #7c3aed, #6366f1);
          color: #fff;
          font-weight: 600;
          text-decoration: none;
        }
      `}</style>
    </>
  );
}
