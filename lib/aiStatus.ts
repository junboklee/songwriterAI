// Whether the AI provider is answering, so the trial page can say so before a visitor writes a
// message. Real requests keep it up to date; when nothing recent is known, one tiny request finds
// out. Kept only in this server instance's memory, so a probe runs at most once per ten minutes.
const FRESH_MS = 10 * 60_000;

let known: { available: boolean; at: number } | null = null;
let probing: Promise<boolean> | null = null;

export function recordAiStatus(available: boolean, now = Date.now()) {
  known = { available, at: now };
}

export async function aiAvailable(probe: () => Promise<boolean>, now = Date.now()) {
  if (known && now - known.at < FRESH_MS) {
    return known.available;
  }
  probing ??= probe()
    .then(available => {
      recordAiStatus(available);
      return available;
    })
    .finally(() => {
      probing = null;
    });
  return probing;
}

export function resetAiStatus() {
  known = null;
  probing = null;
}
