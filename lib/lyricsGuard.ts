// Guards against reproducing lyrics of existing songs (German courts held the operator liable
// for memorised lyrics in GEMA v. OpenAI, 2025-11, and GEMA v. Suno, 2026-07).
// The standing rule lives in lib/songwritingPrompt.ts; this adds a reminder for turns that look
// like a request for existing lyrics, and lets the server log how often that happens.

const EXISTING_LYRICS_REQUEST = [
  /(원곡|원래|실제|정식|공식)\s*가사/,
  /가사\s*(좀\s*|를\s*|만\s*)?(알려|보여|찾아|불러\s*줘|전부\s*알려|전체\s*알려)/,
  /(그대로|똑같이)\s*(써|적어|옮겨|따라|불러)|토씨\s*하나/,
  /(노래|곡)의?\s*가사(가|는|를)?\s*(뭐|어떻게|알려|전체|전부)/,
  /(번역|해석)해\s*줘.*가사|가사.*(번역|해석)해\s*줘/,
  /\b(full|exact|original|actual)\s+lyrics\b/i,
  /\blyrics\s+(of|to)\b/i
];

export function looksLikeExistingLyricsRequest(message: string) {
  return EXISTING_LYRICS_REQUEST.some(pattern => pattern.test(message));
}

export const EXISTING_LYRICS_REMINDER = `# Reminder for this turn
The latest message may ask for the lyrics of an existing song (to show, continue, translate or copy them).
Do not write out, quote, continue or translate those lyrics, not even a few lines. Say briefly and kindly that you can't share existing lyrics,
then offer to write an original song with a similar mood, theme or story instead.`;

// Persona instructions for this turn, with the reminder appended when needed.
export function withLyricsGuard(personaInstructions: string, message: string) {
  return looksLikeExistingLyricsRequest(message)
    ? { instructions: `${personaInstructions.trim()}\n\n${EXISTING_LYRICS_REMINDER}`, flagged: true }
    : { instructions: personaInstructions, flagged: false };
}
