export type AutoSaveLyricsOptions = {
  lyrics: string;
  title?: string | null;
  characterId?: string | null;
  threadId?: string | null;
  characterName?: string | null;
  timestamp?: Date;
};

export type AutoSaveLyricsPayload = {
  title: string;
  lyrics: string;
  characterId: string | null;
  threadId: string | null;
  metadata: {
    source: 'auto-from-chat';
    characterName: string | null;
    storedAt: string;
  };
};

const MAX_AUTO_TITLE_LENGTH = 60;

const firstMeaningfulLine = (value: string) =>
  value
    .split(/\r?\n/)
    .map(line => line.trim())
    .find(line => line.length > 0) ?? '';

export function buildAutoSaveLyricsPayload(
  options: AutoSaveLyricsOptions
): AutoSaveLyricsPayload | null {
  const trimmedLyrics = options.lyrics?.trim();
  if (!trimmedLyrics) {
    return null;
  }

  const timestamp = options.timestamp ?? new Date();
  const fallbackName = options.characterName?.trim() || null;
  const timestampLabel = timestamp.toISOString();
  const autoTitleFromLyrics = firstMeaningfulLine(trimmedLyrics);

  const resolvedTitle = options.title?.trim()
    ? options.title.trim()
    : autoTitleFromLyrics
    ? autoTitleFromLyrics.slice(0, MAX_AUTO_TITLE_LENGTH)
    : fallbackName
    ? `${fallbackName}의 가사`
    : `자동 저장 ${timestampLabel}`;

  return {
    title: resolvedTitle,
    lyrics: trimmedLyrics,
    characterId: options.characterId ?? null,
    threadId: options.threadId ?? null,
    metadata: {
      source: 'auto-from-chat',
      characterName: fallbackName,
      storedAt: timestampLabel
    }
  };
}
