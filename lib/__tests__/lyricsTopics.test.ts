import { LYRICS_TOPICS, getLyricsTopic, topicChatHref } from '@/lib/lyricsTopics';
import { checkSingability } from '@/lib/singability';

describe('lyrics topic pages', () => {
  it('have unique slugs and complete content', () => {
    expect(new Set(LYRICS_TOPICS.map(topic => topic.slug)).size).toBe(LYRICS_TOPICS.length);
    LYRICS_TOPICS.forEach(topic => {
      expect(topic.description.length).toBeGreaterThan(40);
      expect(topic.description.length).toBeLessThanOrEqual(160);
      expect(topic.steps.length).toBeGreaterThanOrEqual(3);
      expect(topic.faq.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('use sample lyrics that pass our own singability check', () => {
    LYRICS_TOPICS.forEach(topic => {
      const warnings = checkSingability(topic.sample.lyrics).filter(issue => issue.severity === 'warn');
      expect({ slug: topic.slug, warnings }).toEqual({ slug: topic.slug, warnings: [] });
    });
  });

  it('link to a chat with the prompt filled in', () => {
    const topic = getLyricsTopic('birthday-song');
    expect(topic).not.toBeNull();
    const href = topicChatHref(topic!);
    expect(href.startsWith('/try?from=topic&prompt=')).toBe(true);
    expect(decodeURIComponent(href.split('prompt=')[1])).toBe(topic!.prompt);
    expect(getLyricsTopic('nope')).toBeNull();
  });
});
