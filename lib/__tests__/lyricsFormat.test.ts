import { extractLyrics, toDisplayText, toMusicToolFormat } from '@/lib/lyricsFormat';
import { toPublicCharacter } from '@/lib/publicCharacter';

const reply = `좋아요, 이렇게 써봤어요.

<lyrics title="새벽 창가">
[Verse 1]
새벽 두 시의 창가
[Chorus]
괜찮아 괜찮아
</lyrics>
<style>lo-fi ballad, soft female vocal, 75bpm, piano</style>

더 슬프게 바꿔볼까요?`;

describe('extractLyrics', () => {
  it('returns title, body and style from the lyrics block', () => {
    expect(extractLyrics(reply)).toEqual({
      title: '새벽 창가',
      body: '[Verse 1]\n새벽 두 시의 창가\n[Chorus]\n괜찮아 괜찮아',
      style: 'lo-fi ballad, soft female vocal, 75bpm, piano'
    });
  });

  it('returns null when there is no block', () => {
    expect(extractLyrics('그냥 대화입니다.')).toBeNull();
  });

  it('uses the last block when the reply contains several versions', () => {
    const text = '<lyrics title="A">one</lyrics>\n<lyrics title="B">two</lyrics>';
    expect(extractLyrics(text)?.title).toBe('B');
  });
});

describe('toDisplayText', () => {
  it('replaces markup with readable labels', () => {
    const display = toDisplayText(reply);
    expect(display).toContain('🎵 새벽 창가');
    expect(display).toContain('🎚 스타일: lo-fi ballad');
    expect(display).not.toMatch(/<\/?lyrics|<\/?style/);
  });

  it('hides a half-streamed opening tag', () => {
    expect(toDisplayText('좋아요 <lyrics title="새')).toBe('좋아요');
  });
});

describe('toMusicToolFormat', () => {
  it('appends the style line', () => {
    expect(toMusicToolFormat({ title: null, body: '[Chorus]\nla', style: 'pop' })).toBe(
      '[Chorus]\nla\n\nStyle: pop'
    );
  });
});

describe('toPublicCharacter', () => {
  it('never exposes prompts or owner ids', () => {
    const result = toPublicCharacter('c1', {
      name: 'Muse',
      instructions: 'secret prompt',
      example: 'secret example',
      assistantId: 'asst_x',
      creatorId: 'user-1',
      visibility: 'public'
    });
    expect(result).not.toHaveProperty('instructions');
    expect(result).not.toHaveProperty('example');
    expect(result).not.toHaveProperty('assistantId');
    expect(result).not.toHaveProperty('creatorId');
    expect(result.name).toBe('Muse');
  });
});

describe('extractLyrics whitespace', () => {
  it('drops trailing spaces the model leaves for Markdown line breaks', () => {
    expect(extractLyrics('<lyrics title="t">\n[Verse 1]  \n첫 줄   \n둘째 줄  \n</lyrics>')?.body).toBe('[Verse 1]\n첫 줄\n둘째 줄');
  });
});
