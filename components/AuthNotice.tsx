import Link from 'next/link';

import { AI_SERVICE_NOTICE } from '@/lib/aiDisclosure';

// Shown under the sign-up and login buttons (Google/Apple sign-in creates accounts too):
// the generative-AI notice plus the terms and privacy policy that apply on sign-up.
export function AuthNotice() {
  return (
    <p className="auth-notice">
      {AI_SERVICE_NOTICE} 계속하면{' '}
      <Link href="/terms" target="_blank">
        이용약관
      </Link>
      과{' '}
      <Link href="/privacy" target="_blank">
        개인정보 처리방침
      </Link>
      에 동의하게 됩니다. 만 14세 미만은 가입할 수 없어요.
    </p>
  );
}
