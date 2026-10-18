// Crisis signals in user messages. Used on the server (extra reminder to the model, counted in
// logs without the text) and in the browser (help-line banner that does not depend on the reply).
// The standing safety rules live in lib/songwritingPrompt.ts and apply to every character.

const CRISIS_SIGNALS = [
  /죽고\s*싶/,
  /자살/,
  /자해/,
  /사라지고\s*싶/,
  // "다 끝내고 싶다" can also mean finishing work; the banner is gentle, so err on the safe side.
  /(다|전부|모두|인생|삶|이번\s*생)(을|를|은|는|이|도)?\s*끝내고\s*싶/,
  /살고\s*싶지\s*않/,
  /살기\s*싫/,
  /목숨(을)?\s*끊/,
  /손목(을)?\s*(긋|그었)/,
  /\b(kill myself|suicid\w*|self[- ]harm|want to die|end my life)\b/i
];

export function looksLikeCrisis(message: string) {
  return CRISIS_SIGNALS.some(pattern => pattern.test(message));
}

export const CRISIS_LINES = [
  { name: '자살예방상담전화', number: '109', note: '24시간' },
  { name: '정신건강위기상담전화', number: '1577-0199', note: '24시간' }
] as const;

export const CRISIS_REMINDER = `# Safety reminder for this turn
The latest message may be about the user wanting to die or hurt themselves. Unless it is clearly fiction or a request about others (e.g. a prevention campaign song), follow the Safety rules: no song in this reply, respond warmly, ask whether they are safe right now, and give 자살예방상담전화 109 and 정신건강위기상담전화 1577-0199.`;
