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

  it('returns null for unknown pages', () => {
    expect(pageCard('nope')).toBeNull();
    expect(pageCard('')).toBeNull();
  });

  it('builds the image path', () => {
    expect(pageCardPath('birthday-song')).toBe('/api/og/page/birthday-song');
  });
});
