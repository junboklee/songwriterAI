// Prompt and parsing for rewriting a selected part of a song (POST /api/lyrics/rewrite).

export const MAX_REWRITE_LYRICS = 6000;
export const MAX_REWRITE_SELECTION = 1500;
export const MAX_REWRITE_INSTRUCTION = 300;

export const REWRITE_INSTRUCTIONS = `You are a professional lyricist editing one part of an existing song.
Rewrite ONLY the selected lines according to the user's request.

Rules
- Keep the same number of lines as the selection unless the request explicitly asks for more or fewer.
- Keep each line's syllable count close to the original line so it still fits the melody.
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

const SECTION_TAG_LINE = /^\s*\[[^\]]*\]\s*$/;

// Returns the rewritten lines, tolerating a missing tag, stray code fences, <br> line breaks
// and trailing spaces (all observed from the model in production).
export function parseRewrite(output: string) {
  const tagged = output.match(/<rewrite>([\s\S]*?)<\/rewrite>/i)?.[1];
  const text = (tagged ?? output)
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n?```$/, '')
    .replace(/^"""\n?|\n?"""$/g, '')
    .replace(/<br\s*\/?>/gi, '\n');
  return text
    .split('\n')
    .map(line => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/^\n+|\n+$/g, '');
}

// Section tags ([Chorus] ...) never go to the model: the lyric lines are rewritten on their own and
// the tags are put back in their original positions, so they can't be dropped or altered.
export function splitSectionTags(selection: string) {
  const lines = selection.split('\n');
  const contentLines = lines.filter(line => !SECTION_TAG_LINE.test(line));
  return { lines, contentText: contentLines.join('\n'), contentCount: contentLines.length };
}

export function restoreSectionTags(originalLines: string[], rewrittenText: string) {
  const rewritten = rewrittenText.split('\n').filter(line => !SECTION_TAG_LINE.test(line));
  const result: string[] = [];
  let next = 0;
  let lastContentIndex = -1;

  originalLines.forEach(line => {
    if (SECTION_TAG_LINE.test(line)) {
      result.push(line);
    } else if (next < rewritten.length) {
      result.push(rewritten[next]);
      next += 1;
      lastContentIndex = result.length - 1;
    }
  });

  // The model returned more lines than were selected: keep them right after the last lyric line.
  if (next < rewritten.length) {
    result.splice(lastContentIndex + 1, 0, ...rewritten.slice(next));
  }

  return result.join('\n');
}

// Replaces the [start, end) character range of `lyrics` with `replacement`.
export function applyRewrite(lyrics: string, start: number, end: number, replacement: string) {
  return lyrics.slice(0, start) + replacement + lyrics.slice(end);
}
