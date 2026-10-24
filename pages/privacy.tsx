import Link from 'next/link';

import { LegalLayout } from '@/components/LegalLayout';
import { AGE_POLICY_START, EXISTING_MEMBER_DEADLINE } from '@/lib/age';
import { OPERATOR, PRIVACY_EFFECTIVE_DATE } from '@/lib/legal';

// Keep this page in sync with what the code actually stores and sends (README "Firestore Data Model").
export default function PrivacyPage() {
  return (
    <LegalLayout
      title="개인정보처리방침"
      effectiveDate={PRIVACY_EFFECTIVE_DATE}
      description="NovaSingerAI가 수집하는 개인정보와 이용 목적, 보관 기간, 외부 위탁 및 이용자의 권리를 안내합니다."
    >
      <p>
        {OPERATOR.companyName}(이하 &quot;운영자&quot;)는 {OPERATOR.serviceName}(이하 &quot;서비스&quot;)를 제공하면서
        「개인정보 보호법」 등 관련 법령을 지키고, 이용자의 개인정보를 다음과 같이 처리합니다.
      </p>

      <h2>1. 수집하는 개인정보</h2>
      <table>
        <thead>
          <tr>
            <th>구분</th>
            <th>항목</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>회원가입·로그인</td>
            <td>
              이메일 주소, 비밀번호(이메일 가입 시, 인증 서비스가 암호화하여 저장하며 운영자는 열람할 수 없음).
              Google·Apple 계정으로 로그인하는 경우 해당 계정의 이메일, 이름, 프로필 사진
            </td>
          </tr>
          <tr>
            <td>비회원 체험</td>
            <td>
              체험에서 입력한 메시지(답변을 만드는 데만 쓰고 저장하지 않음), 이용 횟수 제한을 위한 접속 정보(IP 주소를
              복원할 수 없게 변환한 값)
            </td>
          </tr>
          <tr>
            <td>연령 확인</td>
            <td>
              생년월일(만 19세 이상인지 확인하는 데만 쓰고 저장하지 않음), 연령 확인 시각(계정 정보에 기록)
            </td>
          </tr>
          <tr>
            <td>서비스 이용</td>
            <td>
              닉네임, AI 캐릭터와의 대화 내용, 작성·저장한 가사와 버전 기록, 직접 만든 캐릭터 정보와 업로드한 이미지,
              좋아요·신고 기록, AI 이용량(요청 수, 토큰 수)
            </td>
          </tr>
          <tr>
            <td>자동 수집</td>
            <td>서비스 접속 기록(IP 주소, 브라우저 정보 등 서버 로그), 쿠키 및 Google Analytics 이용 정보</td>
          </tr>
        </tbody>
      </table>

      <h2>2. 이용 목적</h2>
      <ul>
        <li>회원 식별과 계정 관리, 이용 연령(만 19세 이상) 확인</li>
        <li>AI 대화 응답과 가사 생성, 대화·가사·버전의 저장과 표시</li>
        <li>공개 캐릭터·공유 링크 등 이용자가 선택한 공개 기능 제공</li>
        <li>부정 이용 방지(요청 속도 제한, 신고 처리, 공개 콘텐츠 검사)</li>
        <li>서비스 품질 개선과 이용 통계 분석</li>
      </ul>

      <h2>3. 보유 및 이용 기간</h2>
      <ul>
        <li>
          회원 탈퇴 시 대화, 가사와 버전, 공유 페이지, 캐릭터, 업로드 이미지, 이용량 기록을 지체 없이 삭제합니다.
          대화나 곡을 개별 삭제한 경우에도 즉시 삭제됩니다.
        </li>
        <li>서버 접속 기록은 보안과 장애 대응을 위해 최대 30일간 보관 후 삭제합니다.</li>
        <li>비회원 체험의 이용 횟수 기록은 최대 2일간 보관 후 삭제합니다.</li>
        <li>관련 법령에서 보존을 요구하는 경우에는 해당 기간 동안 보관합니다.</li>
      </ul>

      <h2>4. 제3자 제공</h2>
      <p>
        운영자는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 이용자가 직접 &quot;전체 공개&quot;·&quot;링크
        공개&quot;로 설정한 캐릭터와 공개 링크를 만든 가사는 해당 설정의 범위에서 다른 사람이 볼 수 있습니다.
      </p>

      <h2>5. 처리 위탁 및 국외 이전</h2>
      <p>서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하며, 이 과정에서 개인정보가 국외로 이전됩니다.</p>
      <table>
        <thead>
          <tr>
            <th>이전받는 자</th>
            <th>국가</th>
            <th>이전 항목</th>
            <th>목적</th>
            <th>보유 기간</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Google LLC (Firebase, Google Cloud, Google Analytics)</td>
            <td>미국 등 Google 데이터센터 소재 국가</td>
            <td>제1항의 모든 항목</td>
            <td>회원 인증, 데이터 저장, 서비스 호스팅, 이용 통계</td>
            <td>회원 탈퇴 또는 위탁 계약 종료 시까지</td>
          </tr>
          <tr>
            <td>OpenAI, L.L.C. (OpenAI API)</td>
            <td>미국</td>
            <td>AI에 보내는 대화 내용(비회원 체험 메시지 포함), 공개하려는 캐릭터 설명</td>
            <td>AI 응답 생성, 공개 콘텐츠 검사</td>
            <td>OpenAI API 정책에 따라 오남용 감시 목적으로 최대 30일 보관 후 삭제</td>
          </tr>
        </tbody>
      </table>
      <p>
        이전 시기와 방법: 서비스 이용 시점에 암호화된 통신(HTTPS)으로 전송됩니다. 운영자는 OpenAI API에 보낸 데이터를 AI
        모델 학습에 사용하도록 허용하지 않습니다. 국외 이전을 원하지 않으면 회원 탈퇴로 처리를 중단할 수 있으나, 이 경우
        서비스를 이용할 수 없습니다.
      </p>

      <h2>6. 이용자의 권리와 행사 방법</h2>
      <ul>
        <li>대시보드에서 닉네임 변경, 대화·곡 삭제, 회원 탈퇴를 직접 할 수 있습니다.</li>
        <li>
          그 밖에 개인정보 열람·정정·삭제·처리정지를 원하면 아래 개인정보 보호책임자에게 이메일로 요청해 주세요. 지체 없이
          조치하겠습니다.
        </li>
      </ul>

      <h2>7. 파기 절차와 방법</h2>
      <p>보유 기간이 끝났거나 처리 목적이 달성된 개인정보는 복구할 수 없는 방법으로 전자적으로 삭제합니다.</p>

      <h2>8. 안전성 확보 조치</h2>
      <ul>
        <li>모든 통신 구간 암호화(HTTPS)와 로그인 토큰 검증</li>
        <li>데이터베이스·파일 저장소에 대한 외부 직접 접근 차단, 서버를 통한 접근만 허용</li>
        <li>서버 접근 키를 별도의 비밀 관리 서비스에 보관하고 접근 권한을 최소화</li>
      </ul>

      <h2>9. 쿠키 등 자동 수집 장치</h2>
      <p>
        서비스는 로그인 상태 유지와 이용 통계(Google Analytics)를 위해 쿠키와 브라우저 저장소를 사용합니다. 브라우저 설정에서
        쿠키 저장을 거부할 수 있으나, 일부 기능 이용이 제한될 수 있습니다.
      </p>

      <h2>10. 이용 연령</h2>
      <p>
        서비스는 만 19세 이상만 이용할 수 있으며, 만 19세 미만(만 14세 미만 아동 포함)의 회원가입을 받지 않습니다. 가입할 때
        입력한 생년월일은 연령 확인에만 쓰고 저장하지 않습니다. {AGE_POLICY_START} 전에 가입한 회원은{' '}
        {EXISTING_MEMBER_DEADLINE}까지 생년월일을 확인해야 계속 이용할 수 있습니다.
      </p>

      <h2>11. 개인정보 보호책임자</h2>
      <ul>
        <li>
          성명·직책: {OPERATOR.privacyOfficer.name} / {OPERATOR.privacyOfficer.title}
        </li>
        <li>이메일: {OPERATOR.privacyOfficer.email}</li>
      </ul>

      <h2>12. 권익 침해 구제 방법</h2>
      <ul>
        <li>개인정보분쟁조정위원회: 1833-6972 (www.kopico.go.kr)</li>
        <li>개인정보침해신고센터: 118 (privacy.kisa.or.kr)</li>
        <li>대검찰청: 1301 (www.spo.go.kr)</li>
        <li>경찰청: 182 (ecrm.police.go.kr)</li>
      </ul>

      <h2>13. 방침의 변경</h2>
      <p>
        이 방침을 바꾸는 경우 시행 7일 전부터 서비스 화면을 통해 알립니다. 이용약관은{' '}
        <Link href="/terms">이용약관 페이지</Link>에서 확인할 수 있습니다.
      </p>
    </LegalLayout>
  );
}
