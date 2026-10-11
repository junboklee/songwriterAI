import { getTimestampValue, isLikelyLyrics, normaliseMessages } from '@/lib/chat/model';
import {
  extractYouTubeVideoId,
  normaliseYouTubeEmbedUrl,
  pickRandomItem
} from '@/lib/chat/youtube';

describe('chat model helpers', () => {
  it('drops empty messages and trims content', () => {
    expect(
      normaliseMessages([
        { id: '1', role: 'user', content: '  hi  ' },
        { id: '2', role: 'assistant', content: '   ' }
      ])
    ).toEqual([{ id: '1', role: 'user', content: 'hi' }]);
  });

  it('treats short multi-line text as lyrics', () => {
    expect(isLikelyLyrics('첫 줄\n둘째 줄\n셋째 줄')).toBe(true);
    expect(isLikelyLyrics('한 줄짜리 답변입니다.')).toBe(false);
  });

  it('parses timestamps defensively', () => {
    expect(getTimestampValue(null)).toBe(0);
    expect(getTimestampValue('not a date')).toBe(0);
    expect(getTimestampValue('2026-01-01T00:00:00.000Z')).toBe(Date.parse('2026-01-01T00:00:00.000Z'));
  });
});

describe('youtube helpers', () => {
  it('extracts ids from every supported URL shape', () => {
    expect(extractYouTubeVideoId('https://youtu.be/gcq4B9b-pbs')).toBe('gcq4B9b-pbs');
    expect(extractYouTubeVideoId('https://youtube.com/shorts/eQ49JMHQBhs')).toBe('eQ49JMHQBhs');
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/tOihHKzR5M0')).toBe('tOihHKzR5M0');
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=abc123')).toBe('abc123');
    expect(extractYouTubeVideoId('https://example.com/video.mp4')).toBeNull();
  });

  it('builds a muted embed URL', () => {
    const url = new URL(normaliseYouTubeEmbedUrl('https://youtu.be/gcq4B9b-pbs'));
    expect(url.pathname).toBe('/embed/gcq4B9b-pbs');
    expect(url.searchParams.get('mute')).toBe('1');
  });

  it('avoids repeating the excluded item when possible', () => {
    expect(pickRandomItem(['a', 'b'], 'a')).toBe('b');
    expect(pickRandomItem(['a'], 'a')).toBe('a');
    expect(pickRandomItem([], null)).toBeNull();
  });
});
