// "Character memory": at the start of a conversation the character is told which songs the user
// already wrote with it, so it can follow up naturally ("how have you been since that breakup
// song?"). Only the user's own saved songs are used, and only titles, dates and first lines.
import { adminDb } from '@/lib/firebaseAdmin';
import { logWarn } from '@/lib/logger';

export const MEMORY_SONG_LIMIT = 5;
// Memory matters when a conversation starts; later turns already carry it in the history.
export const MEMORY_MAX_HISTORY = 2;
const SCAN_LIMIT = 20;

export type RememberedSong = {
  title: string;
  createdAt: Date | null;
  firstLine: string | null;
};

const SECTION_TAG = /^\s*\[[^\]]*\]\s*$/;
// Titles and lines are the user's own text placed inside the system prompt: keep each on one line
// without quotes so it cannot break out of its list item.
const oneLine = (text: string, max: number) =>
  text.replace(/[\r\n"`#]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);

export const firstLyricLine = (lyrics: unknown) =>
  typeof lyrics === 'string'
    ? lyrics
        .split('\n')
        .map(line => line.trim())
        .find(line => line && !SECTION_TAG.test(line))
        ?.slice(0, 200) ?? null
    : null;

export function describeAge(date: Date | null, now: Date) {
  if (!date) {
    return 'some time ago';
  }
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (days < 1) return 'earlier today';
  if (days < 2) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `about ${Math.round(days / 7)} weeks ago`;
  return `about ${Math.round(days / 30)} months ago`;
}

export function buildSongMemory(songs: RememberedSong[], now = new Date()) {
  if (songs.length === 0) {
    return '';
  }
  const lines = songs.map(song => {
    const first = song.firstLine ? `, first line "${oneLine(song.firstLine, 60)}"` : '';
    return `- "${oneLine(song.title, 60)}" (${describeAge(song.createdAt, now)}${first})`;
  });
  return [
    '# Memory: songs this user already wrote with you',
    'Most recent first. These are real songs you made together, so talk like a friend who remembers them. When the user greets you, says it has been a while, or tells you how they have been, name the most relevant song by its title in that reply and ask how things went since (for example: "\'제목\' 쓰고 나서 어떻게 지냈어?"). Otherwise bring one up only when it clearly fits, such as offering a follow-up song, and do not interrupt a request for a new song with it. Mention earlier songs at most once in a conversation. Do not quote them back in full, and never mention songs that are not listed here.',
    ...lines
  ].join('\n');
}

// Recent songs made with this character, excluding the conversation in progress.
export async function loadSongMemory(userId: string, characterId: string | null, currentThreadId: string | null) {
  try {
    const snapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('songs')
      .orderBy('createdAt', 'desc')
      .limit(SCAN_LIMIT)
      .get();
    const songs = snapshot.docs
      .map(doc => doc.data())
      .filter(data => (data.characterId ?? null) === characterId && (!currentThreadId || data.threadId !== currentThreadId))
      .slice(0, MEMORY_SONG_LIMIT)
      .map(data => ({
        title: typeof data.title === 'string' && data.title.trim() ? data.title : '제목 없는 노래',
        createdAt: data.createdAt?.toDate?.() ?? null,
        firstLine: firstLyricLine(data.lyrics)
      }));
    return buildSongMemory(songs);
  } catch (error) {
    // Memory is a nicety; the chat must work without it.
    logWarn('chat.song_memory_failed', { message: (error as Error)?.message });
    return '';
  }
}
