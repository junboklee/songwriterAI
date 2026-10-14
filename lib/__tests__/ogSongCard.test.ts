jest.mock('next/og', () => ({ ImageResponse: class {} }));

import { cardLines } from '@/lib/ogSongCard';

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
