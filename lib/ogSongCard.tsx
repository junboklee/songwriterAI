import { ImageResponse } from 'next/og';

import { AI_SHARE_LABEL, HUMAN_SHARE_LABEL } from '@/lib/aiDisclosure';

// Share images for /s/{shareId}: 'wide' 1200x630 link preview (Open Graph, KakaoTalk) and
// 'story' 1080x1920 for Instagram/YouTube stories and shorts.

export type CardFormat = 'wide' | 'story';

const SECTION_TAG = /^\[[^\]]*\]$/;
const CHORUS_TAG = /^\[(pre-?)?chorus[^\]]*\]$/i;

const clip = (line: string, maxLength: number) =>
  line.length > maxLength ? `${line.slice(0, maxLength - 1)}…` : line;

export function cardLines(lyrics: string, maxLines = 4, maxLength = 28) {
  return lyrics
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !SECTION_TAG.test(line))
    .slice(0, maxLines)
    .map(line => clip(line, maxLength));
}

// The story card leads with the hook: the first chorus if there is one, else the opening lines.
export function storyLines(lyrics: string, maxLines = 8, maxLength = 18) {
  const lines = lyrics.split(/\r?\n/).map(line => line.trim());
  const start = lines.findIndex(line => CHORUS_TAG.test(line) && !/pre/i.test(line));
  if (start !== -1) {
    const chorus: string[] = [];
    for (const line of lines.slice(start + 1)) {
      if (SECTION_TAG.test(line)) {
        break;
      }
      if (line) {
        chorus.push(clip(line, maxLength));
      }
    }
    if (chorus.length >= 2) {
      return chorus.slice(0, maxLines);
    }
  }
  return cardLines(lyrics, maxLines, maxLength);
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

export async function renderSongCard({
  title,
  lyrics,
  aiAssisted = true,
  format = 'wide'
}: {
  title: string | null;
  lyrics: string;
  aiAssisted?: boolean;
  format?: CardFormat;
}) {
  const story = format === 'story';
  const displayTitle = (title ?? '제목 없는 노래').slice(0, story ? 20 : 30);
  const lines = story ? storyLines(lyrics) : cardLines(lyrics);
  const brand = aiAssisted ? `NovaSingerAI · ${AI_SHARE_LABEL}` : `NovaSingerAI · ${HUMAN_SHARE_LABEL}`;
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
          // Story apps overlay roughly the top 250px (profile, progress) and bottom 340px (reply bar).
          padding: story ? '300px 96px 380px' : '64px 72px',
          background: story
            ? 'linear-gradient(180deg, #0b1020 0%, #1e1b4b 50%, #3b0764 100%)'
            : 'linear-gradient(135deg, #0b1020 0%, #1e1b4b 55%, #3b0764 100%)',
          color: '#f8fafc',
          fontFamily: font ? 'Noto Sans KR' : 'sans-serif'
        }}
      >
        <div style={{ display: 'flex', fontSize: story ? 36 : 30, color: '#c4b5fd' }}>♪ {brand}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: story ? 48 : 18 }}>
          <div style={{ display: 'flex', fontSize: story ? 96 : 64, fontWeight: 700, lineHeight: 1.15 }}>
            {displayTitle}
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: story ? 22 : 6,
              fontSize: story ? 56 : 34,
              lineHeight: 1.35,
              color: '#e2e8f0'
            }}
          >
            {lines.map((line, index) => (
              <div key={index} style={{ display: 'flex' }}>
                {line}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: story ? 38 : 26, color: '#94a3b8' }}>{domain}</div>
      </div>
    ),
    {
      width: story ? 1080 : 1200,
      height: story ? 1920 : 630,
      fonts: font ? [{ name: 'Noto Sans KR', data: font, weight: 700, style: 'normal' }] : undefined
    }
  );
}
