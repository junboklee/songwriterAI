import Head from 'next/head';
import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: '₩0 /월',
    highlights: ['월 50회 AI 요청', '즐겨찾기 캐릭터 2개', '기본 가사 버전 관리'],
    cta: '무료로 시작'
  },
  {
    name: 'Studio',
    price: '₩9,000 /월',
    highlights: ['무제한 AI 요청', '커스텀 캐릭터 & 공유', '팀 협업 폴더', '우선 지원'],
    cta: '14일 체험'
  },
  {
    name: 'Label',
    price: '문의',
    highlights: ['다중 계정', '보안 / 감사 로그', '전담 매니저', '워크플로 API 연동'],
    cta: '세일즈 문의'
  }
];

export default function PricingPage() {
  return (
    <>
      <Head>
        <title>요금제 | SongwriterAI</title>
        <meta
          name="description"
          content="무료·Studio·Label 요금제를 비교하고 팀에 맞는 송라이팅 코파일럿 플랜을 선택하세요."
        />
        <meta property="og:title" content="요금제 | SongwriterAI" />
        <meta
          property="og:description"
          content="송라이팅 팀을 위한 SongwriterAI 요금제와 혜택을 확인해 보세요."
        />
      </Head>
      <main className="page">
        <header>
          <h1>요금 안내</h1>
          <p>
            개인 작업부터 팀 단위 협업까지 바로 사용할 수 있는 간단한 가격 정책입니다. 모든 유료 플랜은 14일 환불
            보장을 제공합니다.
          </p>
        </header>

        <section className="plans">
          {plans.map(plan => (
            <article key={plan.name}>
              <h2>{plan.name}</h2>
              <p className="price">{plan.price}</p>
              <ul>
                {plan.highlights.map(item => (
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
            <h3>결제는 어떻게 진행되나요?</h3>
            <p>신용/체크카드 또는 계좌이체를 Stripe Billing을 통해 안전하게 처리합니다.</p>
          </article>
          <article>
            <h3>언제든 취소할 수 있나요?</h3>
            <p>대시보드에서 언제든 플랜을 다운그레이드하거나 해지할 수 있으며, 미사용 기간은 일할 계산됩니다.</p>
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
