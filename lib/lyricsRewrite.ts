// Prompt and parsing for rewriting a selected part of a song (POST /api/lyrics/rewrite).

export const MAX_REWRITE_LYRICS = 6000;
export const MAX_REWRITE_SELECTION = 1500;
export const MAX_REWRITE_INSTRUCTION = 300;

export const REWRITE_INSTRUCTIONS = `You are a professional lyricist editing one part of an existing song.
Rewrite ONLY the selected lines according to the user's request.

Rules
- Keep the same number of lines as the selection unless the request explicitly asks for more or fewer.
- Keep each line's syllable count close to the original line so it still fits the melody.
- Keep section tags such as [Chorus] exactly as they are if they appear in the selection.
- Stay consistent with the rest of the song: point of view, tense, names, imagery and rhyme scheme.
- Write in the same language as the selection unless asked otherwise. Never copy lyrics of existing songs.
- Output only the rewritten lines inside <rewrite></rewrite>. No explanations.`;

export function buildRewriteInput({
  lyrics,
  selection,
  instruction,
  style
}: {
  lyrics: string;
  selection: string;
  instruction: string;
  style?: string | null;
}) {
  return [
    `Full song for context:\n"""\n${lyrics}\n"""`,
    style ? `Musical style: ${style}` : null,
    `Selected lines to rewrite:\n"""\n${selection}\n"""`,
    `Request: ${instruction}`
  ]
    .filter(Boolean)
    .join('\n\n');
}

// Returns the rewritten lines, tolerating a missing tag or stray code fences.
export function parseRewrite(output: string) {
  const tagged = output.match(/<rewrite>([\s\S]*?)<\/rewrite>/i)?.[1];
  const text = (tagged ?? output)
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n?```$/, '')
    .replace(/^"""\n?|\n?"""$/g, '');
  return text.replace(/^\n+|\s+$/g, '');
}

// Replaces the [start, end) character range of `lyrics` with `replacement`.
export function applyRewrite(lyrics: string, start: number, end: number, replacement: string) {
  return lyrics.slice(0, start) + replacement + lyrics.slice(end);
}
