import { useState } from 'react';

import { useTranslation } from '@/context/I18nContext';
import { diffLines } from '@/lib/lyricsTools';
import { trackEvent } from '@/lib/analytics';

export type LineSelection = {
  start: number;
  end: number;
  text: string;
};

type LyricsRewritePanelProps = {
  lyrics: string;
  selection: LineSelection;
  style: string;
  getIdToken: () => Promise<string>;
  onApply: (replacement: string) => void;
  onClose: () => void;
};

const QUICK_REQUESTS = ['quickSadder', 'quickRhyme', 'quickShorter', 'quickVivid'] as const;

// Expands a textarea selection to whole lines so rewrites never cut a line in half.
export function toLineSelection(value: string, start: number, end: number): LineSelection | null {
  if (end <= start) {
    return null;
  }
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  // end is exclusive; searching from end - 1 keeps a selection that ends right after a newline on that line.
  const newline = value.indexOf('\n', end - 1);
  const lineEnd = newline === -1 ? value.length : newline;
  const text = value.slice(lineStart, lineEnd);
  return text.trim() ? { start: lineStart, end: lineEnd, text } : null;
}

export function LyricsRewritePanel({
  lyrics,
  selection,
  style,
  getIdToken,
  onApply,
  onClose
}: LyricsRewritePanelProps) {
  const { t } = useTranslation('songEditor');
  const [instruction, setInstruction] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lineCount = selection.text.split('\n').length;

  const run = async (request: string) => {
    const trimmed = request.trim();
    if (!trimmed) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch('/api/lyrics/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getIdToken()}` },
        body: JSON.stringify({ lyrics, selection: selection.text, instruction: trimmed, style })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload.error === 'string' ? payload.error : t('error'));
      }
      setInstruction(trimmed);
      trackEvent('lyrics_rewritten', { line_count: lineCount, preset: QUICK_REQUESTS.some(key => t(key) === trimmed) });
      setResult(payload.replacement);
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : t('error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lyrics-rewrite">
      <div className="lyrics-rewrite__header">
        <strong>{t('rewriteTitle', { replacements: { count: lineCount } })}</strong>
        <button type="button" className="lyrics-rewrite__close" onClick={onClose} aria-label={t('close')}>
          ×
        </button>
      </div>

      {result === null ? (
        <>
          <div className="lyrics-rewrite__chips">
            {QUICK_REQUESTS.map(key => (
              <button key={key} type="button" disabled={busy} onClick={() => void run(t(key))}>
                {t(key)}
              </button>
            ))}
          </div>
          <form
            className="lyrics-rewrite__form"
            onSubmit={event => {
              event.preventDefault();
              void run(instruction);
            }}
          >
            <input
              className="suno-form__input"
              value={instruction}
              maxLength={300}
              placeholder={t('rewritePlaceholder')}
              onChange={event => setInstruction(event.target.value)}
              disabled={busy}
            />
            <button type="submit" className="btn btn--primary" disabled={busy || !instruction.trim()}>
              {busy ? t('rewriting') : t('rewriteRun')}
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="song-editor__diff">
            {diffLines(selection.text, result).map((line, index) => (
              <div key={index} className={`song-editor__diff-line song-editor__diff-line--${line.type}`}>
                <span>{line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}</span>
                {line.text || ' '}
              </div>
            ))}
          </div>
          <div className="song-editor__actions">
            <button type="button" className="btn btn--primary" onClick={() => onApply(result)}>
              {t('rewriteApply')}
            </button>
            <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => void run(instruction)}>
              {busy ? t('rewriting') : t('rewriteAgain')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setResult(null)}>
              {t('rewriteBack')}
            </button>
          </div>
          <p className="song-editor__hint">{t('rewriteHint')}</p>
        </>
      )}

      {error ? <p className="lyrics-rewrite__error">{error}</p> : null}
    </div>
  );
}
