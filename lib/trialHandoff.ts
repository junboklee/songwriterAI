// Carries the lyrics written in the no-signup trial (/try) over to the new account: kept in this
// browser only, saved to the library right after sign-up, then removed.
import type { ParsedLyrics } from '@/lib/lyricsFormat';

const KEY = 'novasinger.trialLyrics';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function saveTrialLyrics(lyrics: ParsedLyrics) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...lyrics, savedAt: Date.now() }));
  } catch {
    // Private mode or storage blocked: the visitor can still copy the lyrics by hand.
  }
}

export function takeTrialLyrics(): ParsedLyrics | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    window.localStorage.removeItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed.body !== 'string' || Date.now() - Number(parsed.savedAt) > MAX_AGE_MS) {
      return null;
    }
    return {
      title: typeof parsed.title === 'string' ? parsed.title : null,
      body: parsed.body,
      style: typeof parsed.style === 'string' ? parsed.style : null
    };
  } catch {
    return null;
  }
}
