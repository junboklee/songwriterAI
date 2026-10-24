import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { AuthorshipPanel } from '@/components/AuthorshipPanel';
import { LyricsRewritePanel, toLineSelection, type LineSelection } from '@/components/LyricsRewritePanel';
import { ShareActions } from '@/components/ShareActions';
import { SingabilityFixAll } from '@/components/SingabilityFixAll';
import { SongAudioPanel } from '@/components/SongAudioPanel';
import { SingabilityPanel } from '@/components/SingabilityPanel';
import { useTranslation } from '@/context/I18nContext';
import { applyRewrite } from '@/lib/lyricsRewrite';
import { analyzeLyrics, diffLines } from '@/lib/lyricsTools';
import { copyText } from '@/lib/clipboard';
import { lineRange } from '@/lib/singability';
import type { SongEntry, SongVersion } from '@/types/suno';
import { trackEvent } from '@/lib/analytics';

type SongEditorProps = {
  song: SongEntry;
  getIdToken: () => Promise<string>;
  onClose: () => void;
  onSaved: (song: SongEntry) => void;
};

const RHYME_COLORS = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f87171'];

const readStyle = (song: SongEntry) =>
  typeof song.metadata?.style === 'string' ? (song.metadata.style as string) : '';

export function SongEditor({ song, getIdToken, onClose, onSaved }: SongEditorProps) {
  const { t } = useTranslation('songEditor');
  const [title, setTitle] = useState(song.title ?? '');
  const [style, setStyle] = useState(readStyle(song));
  const [lyrics, setLyrics] = useState(song.lyrics ?? '');
  const [lineSelection, setLineSelection] = useState<LineSelection | null>(null);
  const [rewriteRequest, setRewriteRequest] = useState('');
  // Lines produced by applied AI rewrites; saved with the version for the authorship record.
  const [aiLines, setAiLines] = useState<string[]>([]);
  const [baseline, setBaseline] = useState({ title: song.title ?? '', style: readStyle(song), lyrics: song.lyrics ?? '' });
  const [versions, setVersions] = useState<SongVersion[] | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [copied, setCopied] = useState<'lyrics' | 'style' | null>(null);
  const [shareId, setShareId] = useState<string | null>(song.shareId ?? null);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
    []
  );

  const dirty =
    title !== baseline.title || style !== baseline.style || lyrics !== baseline.lyrics;

  const applyResponse = useCallback(
    (payload: { song?: SongEntry; versions?: SongVersion[] }) => {
      if (payload.versions) {
        setVersions(payload.versions);
      }
      if (payload.song) {
        const next = payload.song;
        setShareId(next.shareId ?? null);
        setTitle(next.title ?? '');
        setStyle(readStyle(next));
        setLyrics(next.lyrics ?? '');
        setBaseline({ title: next.title ?? '', style: readStyle(next), lyrics: next.lyrics ?? '' });
        onSaved(next);
      }
    },
    [onSaved]
  );

  const request = useCallback(
    async (method: 'GET' | 'PATCH', body?: Record<string, unknown>) => {
      const idToken = await getIdToken();
      const response = await fetch(`/api/profile/songs/${encodeURIComponent(song.id)}`, {
        method,
        headers: {
          Authorization: `Bearer ${idToken}`,
          ...(body ? { 'Content-Type': 'application/json' } : {})
        },
        body: body ? JSON.stringify(body) : undefined
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : t('error'));
      }
      return payload as { song?: SongEntry; versions?: SongVersion[] };
    },
    [getIdToken, song.id, t]
  );

  useEffect(() => {
    let cancelled = false;
    request('GET')
      .then(payload => {
        if (!cancelled) {
          setVersions(payload.versions ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVersions([]);
          setStatus({ kind: 'error', message: t('error') });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [request, t]);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const handleClose = () => {
    if (dirty && !window.confirm(t('unsaved'))) {
      return;
    }
    onClose();
  };

  const runMutation = async (body: Record<string, unknown>) => {
    setBusy(true);
    setStatus(null);
    try {
      applyResponse(await request('PATCH', body));
      setSelectedVersionId(null);
      setAiLines([]);
      setStatus({ kind: 'success', message: t('saved') });
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : t('error') });
    } finally {
      setBusy(false);
    }
  };

  const handleSave = () => {
    trackEvent('song_saved', { source: 'editor', revised: true });
    return runMutation({ title, style, lyrics, ...(aiLines.length ? { aiAssisted: true, aiLines } : {}) });
  };

  const handleRestore = (versionId: string) => {
    if (window.confirm(t('restoreConfirm'))) {
      trackEvent('song_version_restored');
      void runMutation({ restoreVersionId: versionId });
    }
  };

  const shareUrl =
    shareId && typeof window !== 'undefined' ? `${window.location.origin}/s/${shareId}` : null;

  // Suno's custom mode has separate Lyrics and Style fields, so each is copied on its own.
  const handleCopy = async (part: 'lyrics' | 'style') => {
    if (await copyText(part === 'lyrics' ? lyrics.trim() : style.trim())) {
      trackEvent('lyrics_copied', { part, target: 'suno' });
      setCopied(part);
      window.setTimeout(() => setCopied(current => (current === part ? null : current)), 2000);
    } else {
      setStatus({ kind: 'error', message: t('error') });
    }
  };

  const selectLine = (selection: LineSelection | null, request = '') => {
    setLineSelection(selection);
    setRewriteRequest(request);
  };

  const analysis = useMemo(() => analyzeLyrics(lyrics), [lyrics]);
  const selectedVersion = versions?.find(version => version.id === selectedVersionId) ?? null;
  const diff = useMemo(
    () => (selectedVersion ? diffLines(selectedVersion.lyrics, lyrics) : null),
    [selectedVersion, lyrics]
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="share-modal" role="dialog" aria-modal="true" aria-label={t('title')}>
      <div className="share-modal__backdrop" onClick={handleClose} />
      <div className="share-modal__content song-editor">
        <header className="share-modal__header">
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{t('title')}</h2>
          <button type="button" className="share-modal__close" onClick={handleClose} aria-label={t('close')}>
            ×
          </button>
        </header>

        <div className="song-editor__body">
          <section className="song-editor__main">
            <label className="song-editor__field">
              <span>{t('titleLabel')}</span>
              <input className="suno-form__input" value={title} onChange={event => setTitle(event.target.value)} />
            </label>
            <label className="song-editor__field">
              <span>{t('styleLabel')}</span>
              <input
                className="suno-form__input"
                value={style}
                placeholder={t('stylePlaceholder')}
                onChange={event => setStyle(event.target.value)}
              />
            </label>
            <label className="song-editor__field">
              <span>{t('lyricsLabel')}</span>
              <textarea
                className="suno-form__textarea"
                rows={12}
                value={lyrics}
                onChange={event => {
                  setLyrics(event.target.value);
                  selectLine(null);
                }}
                onSelect={event => {
                  const target = event.currentTarget;
                  const selection = toLineSelection(target.value, target.selectionStart, target.selectionEnd);
                  // A click without a selection keeps a rewrite opened from the singability check.
                  if (selection) {
                    selectLine(selection);
                  }
                }}
              />
            </label>
            {lineSelection ? (
              <LyricsRewritePanel
                key={`${lineSelection.start}-${lineSelection.end}-${rewriteRequest}`}
                lyrics={lyrics}
                selection={lineSelection}
                style={style}
                initialInstruction={rewriteRequest}
                getIdToken={getIdToken}
                onApply={replacement => {
                  setLyrics(applyRewrite(lyrics, lineSelection.start, lineSelection.end, replacement));
                  setAiLines(prev => [
                    ...prev,
                    ...replacement
                      .split('\n')
                      .map(line => line.trim())
                      .filter(Boolean)
                  ]);
                  selectLine(null);
                }}
                onClose={() => selectLine(null)}
              />
            ) : (
              <p className="song-editor__hint">{t('rewriteSelectHint')}</p>
            )}

            <SingabilityPanel
              lyrics={lyrics}
              onFix={(line, request) => {
                trackEvent('singability_fix_opened');
                selectLine(lineRange(lyrics, line), request);
              }}
              actions={
                <SingabilityFixAll
                  lyrics={lyrics}
                  style={style}
                  getIdToken={getIdToken}
                  onApply={(fixed, fixedLines) => {
                    setLyrics(fixed);
                    setAiLines(prev => [...prev, ...fixedLines]);
                    selectLine(null);
                  }}
                />
              }
            />

            <label className="song-editor__toggle">
              <input
                type="checkbox"
                checked={showAnalysis}
                onChange={event => setShowAnalysis(event.target.checked)}
              />
              {t('analysisToggle')}
            </label>

            {showAnalysis ? (
              <div className="song-editor__analysis">
                <p className="song-editor__hint">{t('analysisHint')}</p>
                {analysis.map((line, index) =>
                  line.isBlank ? (
                    <div key={index} className="song-editor__line song-editor__line--blank" />
                  ) : (
                    <div
                      key={index}
                      className={`song-editor__line${line.isSection ? ' song-editor__line--section' : ''}`}
                    >
                      <span className="song-editor__count">{line.isSection ? '' : line.syllables}</span>
                      <span className="song-editor__text">{line.text}</span>
                      {line.rhymeGroup !== null ? (
                        <span
                          className="song-editor__rhyme"
                          style={{ background: RHYME_COLORS[line.rhymeGroup % RHYME_COLORS.length] }}
                        />
                      ) : null}
                    </div>
                  )
                )}
              </div>
            ) : null}
          </section>

          <aside className="song-editor__versions">
            <div className="song-editor__share">
              <h3>{t('shareTitle')}</h3>
              <p className="song-editor__hint">{t('shareHint')}</p>
              {shareUrl ? (
                <>
                  <a href={shareUrl} target="_blank" rel="noreferrer" className="song-editor__share-url">
                    {shareUrl}
                  </a>
                  {shareId ? (
                    <ShareActions
                      shareId={shareId}
                      url={shareUrl}
                      title={`${title || '제목 없는 노래'} — NovaSingerAI`}
                      description={t('shareHint')}
                    />
                  ) : null}
                  <div className="song-editor__actions">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      disabled={busy}
                      onClick={() => void runMutation({ share: false })}
                    >
                      {t('shareRemove')}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={busy || dirty}
                  onClick={() => {
                    trackEvent('song_shared');
                    void runMutation({ share: true });
                  }}
                >
                  {t('shareCreate')}
                </button>
              )}
            </div>

            <SongAudioPanel songId={song.id} getIdToken={getIdToken} dirty={dirty} />

            {versions?.length ? (
              <AuthorshipPanel title={title} versions={versions} initialFromAi={Boolean(song.threadId) || song.metadata?.source === 'trial'} />
            ) : null}

            <h3>{t('versions')}</h3>
            {versions === null ? <p className="song-editor__hint">{t('versionsLoading')}</p> : null}
            {versions?.length === 0 ? <p className="song-editor__hint">{t('versionsEmpty')}</p> : null}
            {versions?.length ? <p className="song-editor__hint">{t('compareHint')}</p> : null}
            <ul>
              {versions?.map(version => (
                <li key={version.id}>
                  <button
                    type="button"
                    className={`song-editor__version${version.id === selectedVersionId ? ' is-active' : ''}`}
                    onClick={() => setSelectedVersionId(current => (current === version.id ? null : version.id))}
                  >
                    <strong>{t(`source.${version.source}`)}</strong>
                    <span>
                      {version.createdAt ? dateFormatter.format(new Date(version.createdAt)) : ''}
                      {version.title ? ` · ${version.title}` : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {selectedVersion && diff ? (
              <div className="song-editor__diff">
                {diff.map((line, index) => (
                  <div key={index} className={`song-editor__diff-line song-editor__diff-line--${line.type}`}>
                    <span>{line.type === 'added' ? '+' : line.type === 'removed' ? '−' : ' '}</span>
                    {line.text || ' '}
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn--ghost"
                  disabled={busy}
                  onClick={() => handleRestore(selectedVersion.id)}
                >
                  {t('restore')}
                </button>
              </div>
            ) : null}
          </aside>
        </div>

        <footer className="share-modal__footer song-editor__footer">
          <span
            className="song-editor__status"
            style={{ color: status?.kind === 'error' ? 'var(--danger)' : '#6ee7b7' }}
          >
            {status?.message ?? ''}
          </span>
          <div className="song-editor__actions">
            <button type="button" className="btn btn--ghost" onClick={() => void handleCopy('lyrics')} disabled={!lyrics.trim()}>
              {copied === 'lyrics' ? t('copied') : t('copyLyrics')}
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => void handleCopy('style')} disabled={!style.trim()}>
              {copied === 'style' ? t('copied') : t('copyStyle')}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void handleSave()}
              disabled={busy || !dirty || !lyrics.trim()}
            >
              {busy ? t('saving') : t('save')}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
