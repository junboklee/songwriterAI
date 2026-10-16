// Parses the <lyrics title="..."> ... </lyrics> and <style>...</style> markup that
// lib/songwritingPrompt.ts asks the model to emit.

export type ParsedLyrics = {
  title: string | null;
  body: string;
  style: string | null;
};

const LYRICS_BLOCK = /<lyrics(?:\s+title\s*=\s*"([^"]*)")?\s*>([\s\S]*?)<\/lyrics>/gi;
const STYLE_BLOCK = /<style>([\s\S]*?)<\/style>/i;

export function extractLyrics(text: string): ParsedLyrics | null {
  const matches = Array.from(text.matchAll(LYRICS_BLOCK));
  const last = matches[matches.length - 1];
  if (!last) {
    return null;
  }

  // Models sometimes end lines with spaces (Markdown line breaks); keep the saved lyrics clean.
  const body = last[2]
    .split('\n')
    .map(line => line.replace(/\s+$/, ''))
    .join('\n')
    .trim();
  if (!body) {
    return null;
  }

  const style = text.match(STYLE_BLOCK)?.[1]?.trim() || null;

  return {
    title: last[1]?.trim() || null,
    body,
    style
  };
}

// Human-readable version of a (possibly still streaming) reply.
export function toDisplayText(text: string) {
  return text
    .replace(/<lyrics(?:\s+title\s*=\s*"([^"]*)")?\s*>\s*/gi, (_, title?: string) =>
      title?.trim() ? `🎵 ${title.trim()}\n\n` : '🎵\n\n'
    )
    .replace(/\s*<\/lyrics>/gi, '\n')
    .replace(/<style>([\s\S]*?)<\/style>/gi, (_, style: string) => `🎚 스타일: ${style.trim()}`)
    // Unclosed style block: still streaming, or cut off in a stored preview.
    .replace(/<style>([\s\S]*)$/i, (_, style: string) => {
      const value = style.replace(/<\/?s?t?y?l?e?$/i, '').trim();
      return value ? `🎚 스타일: ${value}` : '';
    })
    .replace(/<\/?(?:l|ly|lyr|lyri|lyric|lyrics|s|st|sty|styl|style)?(?:\s[^>]*)?$/i, '')
    .trim();
}

// Format accepted by AI music tools that read [Section] tags (e.g. Suno custom mode).
export function toMusicToolFormat(lyrics: ParsedLyrics) {
  const parts = [lyrics.body];
  if (lyrics.style) {
    parts.push(`\nStyle: ${lyrics.style}`);
  }
  return parts.join('\n');
}
