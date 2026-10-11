import { buildAutoSaveLyricsPayload } from '@/lib/autoSaveLyrics';

describe('buildAutoSaveLyricsPayload', () => {
  it('returns null when lyrics are empty', () => {
    expect(
      buildAutoSaveLyricsPayload({
        lyrics: '   ',
        timestamp: new Date('2025-01-01T00:00:00Z')
      })
    ).toBeNull();
  });

  it('keeps provided title and trims lyrics', () => {
    const timestamp = new Date('2025-02-02T00:00:00Z');
    const payload = buildAutoSaveLyricsPayload({
      lyrics: '  첫 줄입니다.  \n다음 줄',
      title: '  My Draft  ',
      characterId: 'character-1',
      threadId: 'thread-1',
      characterName: 'Dayeon',
      timestamp
    });

    expect(payload).toEqual({
      title: 'My Draft',
      lyrics: '첫 줄입니다.  \n다음 줄',
      characterId: 'character-1',
      threadId: 'thread-1',
      metadata: {
        source: 'auto-from-chat',
        characterName: 'Dayeon',
        style: null,
        storedAt: timestamp.toISOString()
      }
    });
  });

  it('derives title from the first meaningful line and enforces max length', () => {
    const timestamp = new Date('2025-03-03T00:00:00Z');
    const longLine = '아주 긴 첫 번째 줄 '.repeat(5);
    const payload = buildAutoSaveLyricsPayload({
      lyrics: `${longLine}\n두 번째 줄`,
      characterId: null,
      threadId: null,
      characterName: null,
      timestamp
    });

    expect(payload).not.toBeNull();
    expect(payload?.title.length).toBeLessThanOrEqual(60);
    expect(payload?.lyrics.startsWith('아주 긴')).toBe(true);
    expect(payload?.metadata.storedAt).toBe(timestamp.toISOString());
  });

  it('skips section tags when deriving a title', () => {
    const payload = buildAutoSaveLyricsPayload({
      lyrics: '[Verse 1]\n새벽 두 시의 창가\n[Chorus]\n괜찮아',
      style: ' lo-fi ballad ',
      timestamp: new Date('2025-04-04T00:00:00Z')
    });

    expect(payload?.title).toBe('새벽 두 시의 창가');
    expect(payload?.metadata.style).toBe('lo-fi ballad');
  });
});
