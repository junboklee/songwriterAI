import { getAdditionalUserInfo, type UserCredential } from 'firebase/auth';

import { trackEvent } from '@/lib/analytics';

// Kept apart from lib/analytics.ts so components that only track events don't pull in Firebase Auth.
// Popup sign-in (Google/Apple) creates the account on first use, so the same button can be
// a sign-up or a login; Firebase tells us which.
export function trackAuth(
  credential: UserCredential | null,
  method: 'email' | 'google' | 'apple',
  fallback: 'sign_up' | 'login'
) {
  const isNewUser = credential ? getAdditionalUserInfo(credential)?.isNewUser : undefined;
  const event = isNewUser === undefined ? fallback : isNewUser ? 'sign_up' : 'login';
  trackEvent(event, { method });
}
