// Hands lyrics from one free tool to another. Kept in this browser only and removed as soon as the
// next page reads them, so what the tools promise (nothing is sent to the server) stays true.
const KEY = 'novasinger.lyricsDraft';
const MAX_AGE_MS = 10 * 60 * 1000;

export function saveLyricsDraft(text: string) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ text, savedAt: Date.now() }));
  } catch {
    // Private mode or storage blocked: the visitor can still copy the lyrics by hand.
  }
}

export function takeLyricsDraft(): string | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    window.localStorage.removeItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed.text !== 'string' || Date.now() - Number(parsed.savedAt) > MAX_AGE_MS) {
      return null;
    }
    return parsed.text;
  } catch {
    return null;
  }
}
