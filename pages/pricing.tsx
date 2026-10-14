import Head from 'next/head';
import Link from 'next/link';

// Only list what is actually implemented. Paid plans stay marked as upcoming until billing ships.
const plans = [
  {
    name: 'Beta',
    price: '₩0',
    badge: '현재 이용 가능',
    highlights: [
      'AI 캐릭터와 대화하며 가사 작성',
      '커스텀 캐릭터 제작 · 공개 공유',
      '가사 자동 보관 · Suno 형식 복사',
      '월 300회 AI 요청 (매월 1일 초기화)'
    ],
    cta: '무료로 시작',
    href: '/auth/login'
  },
  {
    name: 'Studio',
    price: '출시 예정',
    badge: '준비 중',
    highlights: ['더 많은 AI 요청', '고급 모델 선택', '가사 버전 히스토리', '우선 응답'],
    cta: null,
    href: null
  },
  {
    name: 'Label',
    price: '문의',
    badge: '준비 중',
    highlights: ['다중 계정', '팀 작업 공간', '워크플로 API 연동'],
    cta: null,
    href: null
  }
];

export default function PricingPage() {
  return (
    <>
      <Head>
        <title>요금제 | SongwriterAI</title>
        <meta
          name="description"
          content="NovaSingerAI는 베타 기간 동안 무료로 제공됩니다. 유료 플랜 출시 계획을 확인하세요."
        />
        <meta property="og:title" content="요금제 | SongwriterAI" />
        <meta
          property="og:description"
          content="베타 무료 이용과 유료 플랜 출시 계획 안내."
        />
      </Head>
      <main className="page">
        <header>
          <h1>요금 안내</h1>
          <p>
            NovaSingerAI는 현재 베타 기간으로 모든 기능을 무료로 제공합니다. 유료 플랜은 준비 중이며, 출시 전에
            요금과 환불 정책을 이 페이지에 먼저 안내합니다.
          </p>
        </header>

        <section className="plans">
          {plans.map(plan => (
            <article key={plan.name}>
              <span className="badge">{plan.badge}</span>
              <h2>{plan.name}</h2>
              <p className="price">{plan.price}</p>
              <ul>
                {plan.highlights.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {plan.href && plan.cta ? (
                <Link href={plan.href}>{plan.cta}</Link>
              ) : (
                <span className="cta-disabled">출시 알림 예정</span>
              )}
            </article>
          ))}
        </section>

        <section className="faq">
          <h2>자주 묻는 질문</h2>
          <article>
            <h3>지금 결제가 필요한가요?</h3>
            <p>아니요. 베타 기간에는 결제 수단 등록 없이 모든 기능을 무료로 사용할 수 있습니다.</p>
          </article>
          <article>
            <h3>유료 플랜은 언제 시작되나요?</h3>
            <p>
              출시 일정과 요금, 결제·환불 정책이 확정되면 이 페이지와 서비스 공지로 먼저 알려드립니다. 베타 사용자가
              동의 없이 유료로 전환되는 일은 없습니다.
            </p>
          </article>
        </section>
      </main>

      <style jsx>{`
        .page {
          max-width: 960px;
          margin: 0 auto;
          padding: 4rem 1.5rem 6rem;
        }

        header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .plans {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }

        article {
          border: 1px solid #e5e7eb;
          border-radius: 1rem;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        h2 {
          margin-bottom: 0.5rem;
        }

        .badge {
          align-self: flex-start;
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          background: rgba(124, 58, 237, 0.12);
          color: #7c3aed;
          margin-bottom: 0.75rem;
        }

        .cta-disabled {
          text-align: center;
          margin-top: 1.5rem;
          padding: 0.75rem 1rem;
          border-radius: 999px;
          font-weight: 600;
          border: 1px dashed #c4b5fd;
          color: #7c3aed;
        }

        .price {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
        }

        ul {
          padding-left: 1.2rem;
          flex-grow: 1;
        }

        li {
          margin-bottom: 0.35rem;
        }

        a {
          text-align: center;
          margin-top: 1.5rem;
          padding: 0.75rem 1rem;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 600;
          background: linear-gradient(120deg, #7c3aed, #6366f1);
          color: #fff;
        }

        .faq {
          margin-top: 4rem;
        }

        .faq article {
          margin-bottom: 1rem;
        }
      `}</style>
    </>
  );
}
