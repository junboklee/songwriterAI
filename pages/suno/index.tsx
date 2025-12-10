import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import { AppNav } from '@/components/AppNav';
import { AppShell } from '@/components/AppShell';
import { MainSidebar } from '@/components/MainSidebar';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';
import type { SongEntry } from '@/types/suno';

export default function SunoLibraryPage() {
  const { user } = useAuth();
  const { t } = useTranslation('suno');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [songs, setSongs] = useState<SongEntry[]>([]);
  const [copiedSongId, setCopiedSongId] = useState<string | null>(null);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'selected' | 'all'>('idle');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newSongTitle, setNewSongTitle] = useState('');
  const [newSongPrompt, setNewSongPrompt] = useState('');
  const [newSongLyrics, setNewSongLyrics] = useState('');
  const [newSongStatus, setNewSongStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [savingSong, setSavingSong] = useState(false);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
    []
  );

  useEffect(() => {
    if (!user) {
      setSongs([]);
      setNextCursor(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const idToken = await user.getIdToken();
        const response = await fetch('/api/profile/songs', {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });

        const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
        const payloadSongs = Array.isArray(payload.songs)
          ? (payload.songs as SongEntry[])
          : [];
        const payloadNextCursor =
          typeof payload.nextCursor === 'number' && Number.isFinite(payload.nextCursor)
            ? String(payload.nextCursor)
            : null;
        const payloadError =
          typeof payload.error === 'string' && payload.error.trim() ? payload.error : null;
        if (!response.ok) {
          throw new Error(
            payloadError || t('status.error')
          );
        }

        if (!cancelled) {
          setSongs(payloadSongs);
          setNextCursor(payloadNextCursor);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : t('status.error'));
          setNextCursor(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [t, user]);

  const handleLoadMoreSongs = async () => {
    if (!user || !nextCursor || loadingMore) {
      return;
    }

    setLoadingMore(true);
    setError(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/profile/songs?cursor=${nextCursor}`, {
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });

      const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      const payloadSongs = Array.isArray(payload.songs)
        ? (payload.songs as SongEntry[])
        : [];
      const payloadNextCursor =
        typeof payload.nextCursor === 'number' && Number.isFinite(payload.nextCursor)
          ? String(payload.nextCursor)
          : null;
      const payloadError =
        typeof payload.error === 'string' && payload.error.trim() ? payload.error : null;

      if (!response.ok) {
        throw new Error(payloadError || t('status.error'));
      }

      setSongs(prev => [...prev, ...payloadSongs]);
      setNextCursor(payloadNextCursor);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : t('status.error'));
    } finally {
      setLoadingMore(false);
    }
  };

  const sidebar = useMemo(() => <MainSidebar active="suno" />, []);

  useEffect(() => {
    setSelectedSongIds(prev => {
      const next = new Set<string>();
      const existingIds = new Set(songs.map(song => song.id));
      prev.forEach(id => {
        if (existingIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });

    if (copiedSongId && !songs.some(song => song.id === copiedSongId)) {
      setCopiedSongId(null);
    }
  }, [songs, copiedSongId]);

  const selectedCount = selectedSongIds.size;
  const hasSelection = selectedCount > 0;
  const isDeletingSelected = deleteStatus === 'selected';
  const isDeletingAll = deleteStatus === 'all';

  const toggleSongSelection = (songId: string) => {
    setSelectedSongIds(prev => {
      const next = new Set(prev);
      if (next.has(songId)) {
        next.delete(songId);
      } else {
        next.add(songId);
      }
      return next;
    });
  };

  const resetSelection = () => setSelectedSongIds(new Set());

  const handleSaveSong = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedLyrics = newSongLyrics.trim();
    if (!trimmedLyrics) {
      setNewSongStatus({ kind: 'error', message: t('form.lyricsRequired') });
      return;
    }

    if (!user) {
      setNewSongStatus({ kind: 'error', message: t('form.sessionExpired') });
      return;
    }

    setSavingSong(true);
    setNewSongStatus(null);

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/profile/songs', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newSongTitle.trim() || null,
          prompt: newSongPrompt.trim() || null,
          lyrics: trimmedLyrics
        })
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          typeof payload?.error === 'string' && payload.error.trim()
            ? payload.error
            : t('form.error');
        throw new Error(message);
      }

      const createdSong = payload?.song as SongEntry | undefined;
      if (createdSong) {
        setSongs(prev => [createdSong, ...prev]);
      }

      setNewSongTitle('');
      setNewSongPrompt('');
      setNewSongLyrics('');
      setNewSongStatus({ kind: 'success', message: t('form.success') });
    } catch (saveError) {
      setNewSongStatus({
        kind: 'error',
        message: saveError instanceof Error ? saveError.message : t('form.error')
      });
    } finally {
      setSavingSong(false);
    }
  };

  const deleteSongsOnServer = async (payload: { ids?: string[]; deleteAll?: boolean }) => {
    if (!user) {
      setError(t('status.error'));
      return false;
    }

    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/profile/songs', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const raw = await response.json().catch(() => ({}));
        const message = typeof raw?.error === 'string' ? raw.error : t('status.deleteError');
        throw new Error(message);
      }

      return true;
    } catch (deleteError) {
      console.error('Failed to delete songs', deleteError);
      setError(deleteError instanceof Error ? deleteError.message : t('status.deleteError'));
      return false;
    }
  };

  const handleDeleteSelected = async () => {
    if (!hasSelection || deleteStatus !== 'idle') {
      return;
    }

    const confirmed = window.confirm(
      t('bulk.deleteSelectedConfirm', { replacements: { count: selectedCount } })
    );

    if (!confirmed) {
      return;
    }

    setDeleteStatus('selected');
    const ids = Array.from(selectedSongIds);
    const success = await deleteSongsOnServer({ ids });

    if (success) {
      setSongs(prev => prev.filter(song => !selectedSongIds.has(song.id)));
      resetSelection();
      if (copiedSongId && ids.includes(copiedSongId)) {
        setCopiedSongId(null);
      }
    }

    setDeleteStatus('idle');
  };

  const handleDeleteAll = async () => {
    if (!songs.length || deleteStatus !== 'idle') {
      return;
    }

    const confirmed = window.confirm(t('bulk.deleteAllConfirm'));
    if (!confirmed) {
      return;
    }

    setDeleteStatus('all');
    const success = await deleteSongsOnServer({ deleteAll: true });

    if (success) {
      setSongs([]);
      resetSelection();
      setCopiedSongId(null);
    }

    setDeleteStatus('idle');
  };

  const handleCopySong = async (song: SongEntry) => {
    const title = song.title?.trim() ? song.title.trim() : t('card.untitled');
    const lyrics = song.lyrics?.trim() ? song.lyrics.trim() : t('card.noLyrics');
    const textToCopy = `${title}\n\n${lyrics}`;

    const copyWithTextarea = () => {
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      try {
        document.execCommand('copy');
      } finally {
        document.body.removeChild(textarea);
      }
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        copyWithTextarea();
      }
      setCopiedSongId(song.id);
      setTimeout(() => {
        setCopiedSongId(current => (current === song.id ? null : current));
      }, 2000);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to copy lyrics', err);
      copyWithTextarea();
      setCopiedSongId(song.id);
      setTimeout(() => {
        setCopiedSongId(current => (current === song.id ? null : current));
      }, 2000);
    }
  };

  return (
    <RequireAuth>
      <AppShell sidebar={sidebar}>
        <div className="page-actions-bar">
          <AppNav
            showBrand={false}
            actions={
              <>
                <Link href="/dashboard" className="btn btn--ghost">
                  대시보드
                </Link>
                <Link href="/chat" className="btn btn--ghost">
                  {t('actions.liveChat')}
                </Link>
                <Link href="/history" className="btn btn--primary">
                  {t('actions.history')}
                </Link>
              </>
            }
          />
        </div>

        <div className="suno-page">
          <header className="suno-page__header">
            <div>
              <h1>{t('title')}</h1>
              <p>{t('subtitle')}</p>
            </div>
            <div className="suno-page__actions">
              <span className="suno-page__selection-count">
                {t('bulk.selectedCount', { replacements: { count: selectedCount } })}
              </span>
              <div className="suno-page__button-group">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={handleDeleteSelected}
                  disabled={!hasSelection || deleteStatus !== 'idle'}
                >
                  {isDeletingSelected ? t('bulk.deleting') : t('bulk.deleteSelected')}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={handleDeleteAll}
                  disabled={!songs.length || deleteStatus !== 'idle'}
                >
                  {isDeletingAll ? t('bulk.deleting') : t('bulk.deleteAll')}
                </button>
              </div>
            </div>
          </header>

          <form
            className="glass-panel suno-new-form"
            onSubmit={handleSaveSong}
            style={{ marginTop: 24, display: 'grid', gap: 16 }}
          >
            <div style={{ display: 'grid', gap: 12 }}>
              <label className="suno-form__label" style={{ display: 'grid', gap: 6 }}>
                <span>{t('form.titleLabel')}</span>
                <input
                  type="text"
                  className="suno-form__input"
                  value={newSongTitle}
                  onChange={event => setNewSongTitle(event.target.value)}
                  placeholder={t('form.titlePlaceholder')}
                />
              </label>
              <label className="suno-form__label" style={{ display: 'grid', gap: 6 }}>
                <span>{t('form.promptLabel')}</span>
                <textarea
                  className="suno-form__textarea"
                  value={newSongPrompt}
                  onChange={event => setNewSongPrompt(event.target.value)}
                  placeholder={t('form.promptPlaceholder')}
                  rows={3}
                />
              </label>
              <label className="suno-form__label" style={{ display: 'grid', gap: 6 }}>
                <span>{t('form.lyricsLabel')}</span>
                <textarea
                  className="suno-form__textarea"
                  value={newSongLyrics}
                  onChange={event => setNewSongLyrics(event.target.value)}
                  placeholder={t('form.lyricsPlaceholder')}
                  rows={5}
                  required
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button type="submit" className="btn btn--primary" disabled={savingSong}>
                {savingSong ? t('form.saving') : t('form.save')}
              </button>
              {newSongStatus ? (
                <span
                  className={`suno-form__status suno-form__status--${newSongStatus.kind}`}
                  style={{
                    fontSize: '0.85rem',
                    color: newSongStatus.kind === 'success' ? '#6ee7b7' : 'var(--danger)'
                  }}
                >
                  {newSongStatus.message}
                </span>
              ) : null}
            </div>
          </form>

          {loading ? (
            <div className="suno-page__status suno-page__status--loading">{t('status.loading')}</div>
          ) : null}

          {error ? <div className="suno-page__status suno-page__status--error">{error}</div> : null}

          {!loading && !error && songs.length === 0 ? (
            <div className="suno-page__status">{t('status.empty')}</div>
          ) : null}

          <div className="suno-grid">
            {songs.map(song => {
              const createdAt =
                song.createdAt && !Number.isNaN(new Date(song.createdAt).getTime())
                  ? dateFormatter.format(new Date(song.createdAt))
                  : null;

              return (
                <article key={song.id} className="suno-card">
                  <header className="suno-card__header">
                    <div className="suno-card__header-left">
                      <input
                        type="checkbox"
                        className="suno-card__checkbox"
                        aria-label={t('card.selectLabel')}
                        checked={selectedSongIds.has(song.id)}
                        onChange={() => toggleSongSelection(song.id)}
                      />
                      <div>
                        <p className="suno-card__title">{song.title || t('card.untitled')}</p>
                        {createdAt ? <span className="suno-card__timestamp">{createdAt}</span> : null}
                      </div>
                    </div>
                    {song.characterId ? (
                      <span className="suno-card__badge">
                        {t('card.characterBadge', { replacements: { id: song.characterId } })}
                      </span>
                    ) : null}
                  </header>

                  {song.prompt ? (
                    <section className="suno-card__section">
                      <h3>{t('card.prompt')}</h3>
                      <pre className="suno-card__prompt">{song.prompt}</pre>
                    </section>
                  ) : null}

                  <section className="suno-card__section">
                    <h3>{t('card.lyrics')}</h3>
                    <pre className="suno-card__lyrics">{song.lyrics || t('card.noLyrics')}</pre>
                  </section>

                  {song.metadata && Object.keys(song.metadata).length ? (
                    <section className="suno-card__section suno-card__section--meta">
                      <h3>{t('card.metadata')}</h3>
                      <ul>
                        {Object.entries(song.metadata).map(([key, value]) => (
                          <li key={key}>
                            <strong>{key}</strong>
                            <span>{typeof value === 'string' ? value : JSON.stringify(value)}</span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  <footer className="suno-card__footer">
                    {song.threadId ? (
                      <span className="suno-card__thread">
                        {t('card.thread', { replacements: { id: song.threadId.slice(0, 10) } })}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn--ghost suno-card__share"
                      onClick={() => {
                        void handleCopySong(song);
                      }}
                    >
                      {copiedSongId === song.id ? t('card.copied') : t('card.copy')}
                    </button>
                  </footer>
                </article>
              );
            })}
          </div>

          {nextCursor ? (
            <div className="suno-page__load-more">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  void handleLoadMoreSongs();
                }}
                disabled={loadingMore}
              >
                {loadingMore ? t('status.loadingMore') : t('status.loadMore')}
              </button>
            </div>
          ) : null}
        </div>
      </AppShell>
    </RequireAuth>
  );
}
