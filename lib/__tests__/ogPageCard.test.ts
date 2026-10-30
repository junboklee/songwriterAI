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

  it('has a card for each free tool, and no topic takes their slugs', () => {
    expect(pageCard('check')).toEqual(expect.objectContaining({ label: '무료 도구' }));
    expect(pageCard('style')).toEqual(expect.objectContaining({ label: '무료 도구' }));
    const reserved = ['home', 'check', 'style'];
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
