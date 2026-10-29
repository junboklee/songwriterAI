import { pageCard, pageCardPath } from '@/lib/ogPageCard';
import { LYRICS_TOPICS } from '@/lib/lyricsTopics';

describe('pageCard', () => {
  it('has a card for the landing page and every topic page', () => {
    expect(pageCard('home')).toEqual(expect.objectContaining({ title: expect.any(String) }));
    LYRICS_TOPICS.forEach(topic => {
      expect(pageCard(topic.slug)).toEqual({
        title: topic.title,
        lyrics: topic.sample.lyrics,
        label: expect.stringContaining(topic.sample.title)
      });
    });
  });

  it('has a card for the lyrics checker, and no topic takes its slug', () => {
    expect(pageCard('check')).toEqual(expect.objectContaining({ label: '무료 도구' }));
    const reserved = ['home', 'check'];
    LYRICS_TOPICS.forEach(topic => expect(reserved).not.toContain(topic.slug));
  });

  it('returns null for unknown pages', () => {
    expect(pageCard('nope')).toBeNull();
    expect(pageCard('')).toBeNull();
  });

  it('builds the image path', () => {
    expect(pageCardPath('birthday-song')).toBe('/api/og/page/birthday-song');
  });
});
