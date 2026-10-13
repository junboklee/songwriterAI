import { toLineSelection } from '@/components/LyricsRewritePanel';
import { EMPTY_BRIEF, buildBriefPrompt } from '@/lib/chat/brief';
import {
  applyRewrite,
  buildRewriteInput,
  parseRewrite,
  restoreSectionTags,
  splitSectionTags
} from '@/lib/lyricsRewrite';

describe('buildBriefPrompt', () => {
  it('lists only the chosen options plus length and language', () => {
    const prompt = buildBriefPrompt({ ...EMPTY_BRIEF, topic: ' 첫눈 오는 날 ', genre: '발라드', tempo: '느리게' });
    expect(prompt).toBe(
      '이런 노래 가사를 써줘.\n- 주제: 첫눈 오는 날\n- 장르: 발라드\n- 템포: 느리게\n- 구성: 1절과 후렴만 짧게\n- 언어: 한국어'
    );
    expect(prompt).not.toContain('분위기');
  });
});

describe('toLineSelection', () => {
  const text = '[Verse 1]\n첫째 줄\n둘째 줄\n셋째 줄';

  it('expands a partial selection to whole lines', () => {
    const start = text.indexOf('째 줄');
    const end = text.indexOf('둘째') + 2;
    expect(toLineSelection(text, start, end)).toEqual({
      start: text.indexOf('첫째'),
      end: text.indexOf('\n셋째'),
      text: '첫째 줄\n둘째 줄'
    });
  });

  it('keeps a selection that ends right after a newline on its own line', () => {
    const start = text.indexOf('첫째');
    const end = text.indexOf('둘째');
    expect(toLineSelection(text, start, end)?.text).toBe('첫째 줄');
  });

  it('ignores collapsed or blank selections', () => {
    expect(toLineSelection(text, 3, 3)).toBeNull();
    expect(toLineSelection('a\n\n\nb', 2, 3)).toBeNull();
  });
});

describe('rewrite helpers', () => {
  it('parses tagged output and tolerates missing tags or fences', () => {
    expect(parseRewrite('<rewrite>\n새 줄 하나\n새 줄 둘\n</rewrite>')).toBe('새 줄 하나\n새 줄 둘');
    expect(parseRewrite('```\n그냥 텍스트\n```')).toBe('그냥 텍스트');
  });

  it('replaces exactly the selected range', () => {
    const lyrics = 'A\nB\nC';
    expect(applyRewrite(lyrics, 2, 3, 'B2\nB3')).toBe('A\nB2\nB3\nC');
  });

  it('includes context, style and request in the model input', () => {
    const input = buildRewriteInput({ lyrics: 'L', selection: 'S', instruction: '더 슬프게', style: 'ballad' });
    expect(input).toContain('Full song for context');
    expect(input).toContain('Musical style: ballad');
    expect(input).toContain('Request: 더 슬프게');
  });
});

describe('rewrite output cleanup (cases seen in production)', () => {
  it('turns <br> into line breaks and drops trailing spaces', () => {
    expect(parseRewrite('<rewrite>너의 이름을 속삭여<br>차가운 침묵만 흐르고</rewrite>')).toBe(
      '너의 이름을 속삭여\n차가운 침묵만 흐르고'
    );
    expect(parseRewrite('<rewrite>너의 꿈을 그려봐 \n고요한 침묵 속에 </rewrite>')).toBe('너의 꿈을 그려봐\n고요한 침묵 속에');
  });
});

describe('section tags around a rewrite', () => {
  it('sends only lyric lines to the model', () => {
    expect(splitSectionTags('[Chorus]\n괜찮다고 말해줘')).toEqual({
      lines: ['[Chorus]', '괜찮다고 말해줘'],
      contentText: '괜찮다고 말해줘',
      contentCount: 1
    });
  });

  it('puts tags back in their original positions', () => {
    const original = ['밤이 깊어', '[Chorus]', '괜찮다고 말해줘'];
    expect(restoreSectionTags(original, '새벽이 와\n희망이 있다고 말해줘')).toBe('새벽이 와\n[Chorus]\n희망이 있다고 말해줘');
  });

  it('ignores tags the model invents and keeps extra lines after the last lyric', () => {
    const original = ['[Chorus]', '괜찮다고 말해줘'];
    expect(restoreSectionTags(original, '[Verse 9]\n희망이 있어\n한 줄 더')).toBe('[Chorus]\n희망이 있어\n한 줄 더');
  });
});
