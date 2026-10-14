// GA4 events for the creation funnel (sign up -> chat -> lyrics -> save -> share).
// Never send personal data or user content here: ids of type, counts and labels only.

export type AnalyticsEvent =
  | 'sign_up'
  | 'login'
  | 'chat_message_sent'
  | 'lyrics_generated'
  | 'song_saved'
  | 'song_version_restored'
  | 'song_shared'
  | 'lyrics_rewritten'
  | 'brief_wizard_used'
  | 'character_created'
  | 'character_liked'
  | 'character_reported';

type EventParams = Record<string, string | number | boolean | null | undefined>;

type Gtag = (command: 'event', name: string, params?: EventParams) => void;

export function trackEvent(name: AnalyticsEvent, params: EventParams = {}) {
  if (typeof window === 'undefined') {
    return;
  }
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag !== 'function') {
    return;
  }
  try {
    gtag('event', name, params);
  } catch {
    // Analytics must never break the product.
  }
}
