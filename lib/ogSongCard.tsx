import { ImageResponse } from 'next/og';

// 1200x630 share card for /s/{shareId}: song title, a few lyric lines and the service name.

const SECTION_TAG = /^\[[^\]]*\]$/;
const MAX_LINES = 4;
const MAX_LINE_LENGTH = 28;

export function cardLines(lyrics: string) {
  return lyrics
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !SECTION_TAG.test(line))
    .slice(0, MAX_LINES)
    .map(line => (line.length > MAX_LINE_LENGTH ? `${line.slice(0, MAX_LINE_LENGTH - 1)}…` : line));
}

// Google Fonts can return a subset containing only the glyphs we draw, which keeps the
// Korean font download small. Returns null if the font can't be fetched (card still renders).
async function loadKoreanFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(text)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36' } }
    ).then(response => response.text());
    const url = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype|woff)'\)/)?.[1];
    if (!url) {
      return null;
    }
    return await fetch(url).then(response => response.arrayBuffer());
  } catch {
    return null;
  }
}

export async function renderSongCard({ title, lyrics }: { title: string | null; lyrics: string }) {
  const displayTitle = (title ?? '제목 없는 노래').slice(0, 30);
  const lines = cardLines(lyrics);
  const brand = 'NovaSingerAI · AI와 함께 쓴 가사';
  const domain = 'novasingerai.com';
  const font = await loadKoreanFont(`${displayTitle}${lines.join('')}${brand}${domain}…♪`);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          background: 'linear-gradient(135deg, #0b1020 0%, #1e1b4b 55%, #3b0764 100%)',
          color: '#f8fafc',
          fontFamily: font ? 'Noto Sans KR' : 'sans-serif'
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, color: '#c4b5fd' }}>♪ {brand}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, lineHeight: 1.15 }}>{displayTitle}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 34, color: '#e2e8f0' }}>
            {lines.map((line, index) => (
              <div key={index} style={{ display: 'flex' }}>
                {line}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: '#94a3b8' }}>{domain}</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: font ? [{ name: 'Noto Sans KR', data: font, weight: 700, style: 'normal' }] : undefined
    }
  );
}
