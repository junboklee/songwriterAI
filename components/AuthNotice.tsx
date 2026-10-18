import { AI_SERVICE_NOTICE } from '@/lib/aiDisclosure';

// Generative-AI notice under the sign-up and login buttons (Google/Apple sign-in creates
// accounts too). The terms and privacy links are in AuthLayout's footer line.
export function AuthNotice() {
  return <p className="auth-notice">{AI_SERVICE_NOTICE}</p>;
}
