import { EXISTING_LYRICS_REMINDER, looksLikeExistingLyricsRequest, withLyricsGuard } from '@/lib/lyricsGuard';
import { SONGWRITING_GUIDELINES } from '@/lib/songwritingPrompt';

describe('looksLikeExistingLyricsRequest', () => {
  it.each([
    '아이유 밤편지 원곡 가사 알려줘',
    '이 노래 가사 좀 알려줘',
    '그 곡 가사 전체 알려줘',
    '봄날 가사를 그대로 써줘',
    '가사 토씨 하나 안 틀리고 적어줘',
    'Dynamite 가사 번역해줘',
    'Can you give me the full lyrics of Yesterday?',
    'what are the lyrics to Hey Jude'
  ])('flags "%s"', message => {
    expect(looksLikeExistingLyricsRequest(message)).toBe(true);
  });

  it.each([
    '이별 노래 가사 써줘',
    '엄마 생일 노래 가사 만들어줘',
    '내가 쓴 가사 다듬어줘',
    '후렴 가사만 다시 써줘',
    'write lyrics for my mom’s birthday',
    '오늘 너무 힘들었어'
  ])('does not flag an original-writing request: "%s"', message => {
    expect(looksLikeExistingLyricsRequest(message)).toBe(false);
  });
});

describe('withLyricsGuard', () => {
  it('appends the reminder only when the message looks like an existing-lyrics request', () => {
    expect(withLyricsGuard('persona', '원곡 가사 알려줘')).toEqual({
      instructions: `persona\n\n${EXISTING_LYRICS_REMINDER}`,
      flagged: true
    });
    expect(withLyricsGuard('persona', '이별 노래 써줘')).toEqual({ instructions: 'persona', flagged: false });
  });
});

describe('songwriting rules', () => {
  it('forbid reproducing existing lyrics and naming real artists in the style prompt', () => {
    expect(SONGWRITING_GUIDELINES).toContain('Never write out, quote, continue, translate');
    expect(SONGWRITING_GUIDELINES).toContain('Never name real artists, bands or songs there.');
  });
});
