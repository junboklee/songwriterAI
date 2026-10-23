import Link from 'next/link';

import { LegalLayout } from '@/components/LegalLayout';
import { OPERATOR, SAFETY_POLICY_EFFECTIVE_DATE } from '@/lib/legal';

// Public safety policy: crisis response, what characters and content are not allowed, reporting.
// Keep in sync with lib/songwritingPrompt.ts (Safety rules), lib/safety.ts and lib/lyricsGuard.ts.
export default function SafetyPage() {
  return (
    <LegalLayout
      title="안전 정책"
      effectiveDate={SAFETY_POLICY_EFFECTIVE_DATE}
      description="NovaSingerAI의 위기 대응 방식, 금지되는 캐릭터와 콘텐츠, 신고 방법을 안내합니다."
    >
      <p>
        {OPERATOR.serviceName}는 AI 캐릭터와 함께 가사를 쓰는 서비스입니다. 모든 캐릭터(기본 캐릭터와 회원이 만든 캐릭터)는
        아래 원칙을 따르며, 캐릭터 설정으로 이 원칙을 바꿀 수 없습니다.
      </p>

      <h2 id="crisis">1. 위기 상황 대응</h2>
      <ul>
        <li>
          대화에서 스스로를 해치거나 삶을 끝내고 싶다는 마음이 드러나면, AI는 그 답변에서 노래를 만들지 않고 안부를 묻고
          도움을 받을 수 있는 곳을 안내합니다.
        </li>
        <li>
          화면에도 AI 답변과 상관없이 상담 전화가 표시됩니다: 자살예방상담전화 <strong>109</strong>(24시간),
          정신건강위기상담전화 <strong>1577-0199</strong>(24시간). 위급할 때는 119 또는 112에 연락하세요.
        </li>
        <li>
          이런 대화가 있었다는 사실만 횟수로 집계해 대응 방식을 점검하며, 대화 내용을 별도로 기록하거나 사람이 열람하지
          않습니다.
        </li>
        <li>AI는 전문 상담을 대신할 수 없습니다. 위험하다고 느끼면 꼭 주변 사람이나 전문 기관에 도움을 요청하세요.</li>
      </ul>

      <h2 id="ai">2. AI라는 사실의 고지</h2>
      <ul>
        <li>서비스는 OpenAI의 생성형 AI 모델로 답변과 가사를 만듭니다. 캐릭터는 실제 사람이 아닙니다.</li>
        <li>캐릭터에게 진지하게 사람인지 물으면 AI라고 답합니다.</li>
        <li>AI가 만든 결과물에는 &quot;AI 생성&quot; 표시가 붙습니다.</li>
      </ul>

      <h2 id="characters">3. 만들거나 공개할 수 없는 캐릭터와 콘텐츠</h2>
      <ul>
        <li>실존 인물(가수, 연예인, 공인, 주변 사람)을 사칭하거나 그 사람인 것처럼 말하는 캐릭터</li>
        <li>성적인 콘텐츠, 미성년자를 성적으로 표현하는 콘텐츠</li>
        <li>폭력이나 자해를 부추기는 콘텐츠, 특정인을 괴롭히거나 혐오를 드러내는 콘텐츠</li>
        <li>기존 곡의 가사를 그대로 옮기거나 번역한 콘텐츠 (AI도 기존 곡 가사를 쓰지 않도록 설계되어 있습니다)</li>
      </ul>
      <p>
        공개하려는 캐릭터는 공개 전에 자동 검사를 거치며, 위 기준에 맞지 않으면 공개되지 않거나 신고 검토 후 숨겨질 수
        있습니다.
      </p>

      <h2 id="age">4. 이용 연령</h2>
      <p>
        만 19세 이상만 이용할 수 있습니다. 가입할 때 생년월일로 만 19세 이상인지 확인하고, 노래 생성·결제 등 일부 기능은
        이용 전에 본인인증을 거칠 수 있습니다.
      </p>

      <h2 id="report">5. 신고</h2>
      <ul>
        <li>공개 캐릭터 화면의 &quot;신고&quot; 버튼으로 신고할 수 있습니다. 신고된 캐릭터는 운영자가 검토합니다.</li>
        <li>
          그 밖의 안전 문제나 권리 침해는 {OPERATOR.contactEmail}로 알려 주세요. 자세한 내용은{' '}
          <Link href="/terms">이용약관</Link>을 참고하세요.
        </li>
      </ul>
    </LegalLayout>
  );
}
