import { useState } from 'react';

import { extractLyrics, toDisplayText, toMusicToolFormat } from '@/lib/lyricsFormat';

type Props = {
  content: string;
};

// Renders an assistant reply, hiding the <lyrics>/<style> markup and offering a
// one-click copy of the lyrics in [Section]-tag format for AI music tools.
export function AssistantMessageBody({ content }: Props) {
  const [copied, setCopied] = useState(false);
  const lyrics = extractLyrics(content);

  const handleCopy = async () => {
    if (!lyrics) {
      return;
    }
    try {
      await navigator.clipboard.writeText(toMusicToolFormat(lyrics));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <span style={{ whiteSpace: 'pre-wrap' }}>{toDisplayText(content)}</span>
      {lyrics ? (
        <button
          type="button"
          onClick={handleCopy}
          style={{
            display: 'block',
            marginTop: 10,
            padding: '6px 12px',
            borderRadius: 999,
            border: '1px solid currentColor',
            background: 'transparent',
            color: 'inherit',
            fontSize: '0.8rem',
            cursor: 'pointer',
            opacity: 0.85
          }}
        >
          {copied ? '복사됨 ✓' : '가사 복사 (Suno 형식)'}
        </button>
      ) : null}
    </>
  );
}
