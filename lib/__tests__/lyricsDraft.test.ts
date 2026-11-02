import { saveLyricsDraft, takeLyricsDraft } from '@/lib/lyricsDraft';

describe('lyrics draft handoff', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => jest.restoreAllMocks());

  it('hands the text over once', () => {
    saveLyricsDraft('[Verse]\n첫 줄');
    expect(takeLyricsDraft()).toBe('[Verse]\n첫 줄');
    expect(takeLyricsDraft()).toBeNull();
  });

  it('ignores old or broken drafts', () => {
    const now = Date.now();
    saveLyricsDraft('오래된 가사');
    jest.spyOn(Date, 'now').mockReturnValue(now + 11 * 60 * 1000);
    expect(takeLyricsDraft()).toBeNull();
    expect(window.localStorage.getItem('novasinger.lyricsDraft')).toBeNull();

    window.localStorage.setItem('novasinger.lyricsDraft', '{broken');
    expect(takeLyricsDraft()).toBeNull();
  });
});
