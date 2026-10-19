import { useMemo } from 'react';

import { trackEvent } from '@/lib/analytics';
import { authorshipReport, buildAuthorship } from '@/lib/authorship';
import type { SongVersion } from '@/types/suno';

type AuthorshipPanelProps = {
  title: string | null;
  versions: SongVersion[];
  initialFromAi: boolean;
};

// Summary of who wrote the saved lyrics (AI / AI rewrite / person) with a text export.
export function AuthorshipPanel({ title, versions, initialFromAi }: AuthorshipPanelProps) {
  const authorship = useMemo(() => buildAuthorship(versions, initialFromAi), [versions, initialFromAi]);
  const { counts, lines } = authorship;

  const download = () => {
    const blob = new Blob([authorshipReport(title, authorship)], { type: 'text/plain;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `창작기록-${(title?.trim() || '노래').replace(/[\\/:*?"<>|]/g, '')}.txt`;
    link.click();
    URL.revokeObjectURL(href);
    trackEvent('authorship_exported');
  };

  if (!lines.length) {
    return null;
  }

  return (
    <section className="authorship" aria-label="창작 기록">
      <h3>창작 기록</h3>
      <p className="song-editor__hint">저장된 버전을 바탕으로 최종 가사의 각 줄을 누가 썼는지 보여 줘요.</p>
      <ul className="authorship__counts">
        <li>
          <strong>{counts.human}</strong>사람
        </li>
        <li>
          <strong>{counts.ai}</strong>AI
        </li>
        <li>
          <strong>{counts.aiRewrite}</strong>AI 다시 쓰기
        </li>
      </ul>
      <button type="button" className="btn btn--ghost" onClick={download}>
        창작 기록 내보내기 (.txt)
      </button>
      <p className="song-editor__hint">저작권 등록이나 보호를 보장하지 않아요. 등록할 때는 해당 기관 기준을 확인하세요.</p>
    </section>
  );
}
