import Head from 'next/head';
import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: '₩0 /월',
    highlights: ['월 50회 AI 요청', '2개의 즐겨찾는 캐릭터', '기본 버전 히스토리'],
    cta: '무료로 시작'
  },
  {
    name: 'Studio',
    price: '₩19,000 /월',
    highlights: ['무제한 AI 요청', '커스텀 캐릭터 & 스타일', '협업용 공유 폴더', '우선 응답'],
    cta: '14일 체험'
  },
  {
    name: 'Label',
    price: '문의',
    highlights: ['팀 계정', '보안 / 감사 로그', '전담 매니저', '워크플로 API 연동'],
    cta: '영업팀 문의'
  }
];

export default function PricingPage() {
  return (
    <>
      <Head>
        <title>요금제 | SongwriterAI</title>
        <meta
          name="description"
          content="SongwriterAI Free, Studio, Label 플랜 가격과 혜택을 비교하고 팀에 맞는 옵션을 선택하세요."
        />
        <meta property="og:title" content="요금제 | SongwriterAI" />
        <meta
          property="og:description"
          content="SongwriterAI 플랜을 비교하고 팀에 맞는 옵션을 선택하세요."
        />
      </Head>
      <main className="page">
        <header>
          <h1>요금제 안내</h1>
          <p>
            개인 작업부터 레이블 단위 협업까지 단계별 요금제로 제공됩니다. 모든 유료 플랜은 14일 환불 보장을
            제공합니다.
          </p>
        </header>

        <section className="plans">
          {plans.map((plan) => (
            <article key={plan.name}>
              <h2>{plan.name}</h2>
              <p className="price">{plan.price}</p>
              <ul>
                {plan.highlights.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link href="/auth/login">{plan.cta}</Link>
            </article>
          ))}
        </section>

        <section className="faq">
          <h2>결제 관련 FAQ</h2>
          <article>
            <h3>결제는 어떻게 이루어지나요?</h3>
            <p>신용카드와 계좌이체를 지원하며, Stripe Billing으로 안전하게 처리됩니다.</p>
          </article>
          <article>
            <h3>언제든 해지할 수 있나요?</h3>
            <p>언제든 대시보드에서 플랜을 다운그레이드하거나 취소할 수 있고 남은 기간만큼 일할 계산됩니다.</p>
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
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
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
