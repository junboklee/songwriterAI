jest.mock('next/og', () => ({ ImageResponse: class {} }));

import { cardLines, storyLines } from '@/lib/ogSongCard';

describe('cardLines', () => {
  it('skips section tags, keeps at most four lines and shortens long ones', () => {
    const lines = cardLines(
      '[Verse 1]\n창밖엔 비가 내리고\n\n너의 이름을 불러봐\n아무 대답 없는 밤에 나는 혼자서 너를 기다리고 또 기다려\n[Chorus]\n괜찮다고 말해줘\n다섯째 줄'
    );
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe('창밖엔 비가 내리고');
    expect(lines[2].endsWith('…')).toBe(true);
    expect(lines[2].length).toBe(28);
    expect(lines).not.toContain('[Chorus]');
  });
});

describe('storyLines', () => {
  it('leads with the chorus (the hook), not the pre-chorus', () => {
    const lyrics =
      '[Verse 1]\n첫 줄\n둘째 줄\n[Pre-Chorus]\n올라가는 줄\n[Chorus]\n괜찮아 괜찮아\n너라서 괜찮아\n[Verse 2]\n다음 이야기';
    expect(storyLines(lyrics)).toEqual(['괜찮아 괜찮아', '너라서 괜찮아']);
  });

  it('falls back to the opening lines and shortens long ones for the narrow card', () => {
    const lines = storyLines('[Verse]\n아주 길고 긴 줄이 이어져서 한 줄에 다 들어가지 않는 문장\n짧은 줄');
    expect(lines[0]).toHaveLength(18);
    expect(lines[0].endsWith('…')).toBe(true);
    expect(lines[1]).toBe('짧은 줄');
  });
});
