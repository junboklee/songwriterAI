import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

import { AppNav } from '@/components/AppNav';
import { AppShell } from '@/components/AppShell';
import { MainSidebar } from '@/components/MainSidebar';
import { RequireAuth } from '@/components/RequireAuth';
import { SongEditor } from '@/components/SongEditor';
import { NewSongForm } from '@/components/suno/NewSongForm';
import { SongCard } from '@/components/suno/SongCard';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';
import { useSongLibrary } from '@/hooks/useSongLibrary';

export default function SunoLibraryPage() {
  const { user } = useAuth();
  const { t } = useTranslation('suno');
  const library = useSongLibrary(user, {
    loadError: t('status.error'),
    deleteError: t('status.deleteError'),
    saveError: t('form.error'),
    sessionExpired: t('form.sessionExpired')
  });
  const { songs } = library;
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'selected' | 'all'>('idle');
  const [editingSongId, setEditingSongId] = useState<string | null>(null);

  const editingSong = songs.find(song => song.id === editingSongId) ?? null;
  const getIdToken = useCallback(async () => {
    if (!user) {
      throw new Error(t('form.sessionExpired'));
    }
    return user.getIdToken();
  }, [t, user]);

  const sidebar = useMemo(() => <MainSidebar active="suno" />, []);

  // Only songs still in the list count as selected.
  const selectedSongIds = useMemo(
    () => songs.filter(song => selectedIds.has(song.id)).map(song => song.id),
    [selectedIds, songs]
  );
  const selectedCount = selectedSongIds.length;

  const toggleSongSelection = (songId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (!next.delete(songId)) {
        next.add(songId);
      }
      return next;
    });
  };

  const handleDelete = async (scope: 'selected' | 'all') => {
    if (deleteStatus !== 'idle') {
      return;
    }
    const confirmMessage =
      scope === 'all'
        ? t('bulk.deleteAllConfirm')
        : t('bulk.deleteSelectedConfirm', { replacements: { count: selectedCount } });
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setDeleteStatus(scope);
    if (await library.deleteSongs(scope === 'all' ? 'all' : selectedSongIds)) {
      setSelectedIds(new Set());
    }
    setDeleteStatus('idle');
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
                  onClick={() => {
                    void handleDelete('selected');
                  }}
                  disabled={!selectedCount || deleteStatus !== 'idle'}
                >
                  {deleteStatus === 'selected' ? t('bulk.deleting') : t('bulk.deleteSelected')}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    void handleDelete('all');
                  }}
                  disabled={!songs.length || deleteStatus !== 'idle'}
                >
                  {deleteStatus === 'all' ? t('bulk.deleting') : t('bulk.deleteAll')}
                </button>
              </div>
            </div>
          </header>

          <NewSongForm onCreate={library.createSong} />

          {library.loading ? (
            <div className="suno-page__status suno-page__status--loading">{t('status.loading')}</div>
          ) : null}

          {library.error ? <div className="suno-page__status suno-page__status--error">{library.error}</div> : null}

          {!library.loading && !library.error && songs.length === 0 ? (
            <div className="suno-page__status">{t('status.empty')}</div>
          ) : null}

          <div className="suno-grid">
            {songs.map(song => (
              <SongCard
                key={song.id}
                song={song}
                selected={selectedIds.has(song.id)}
                onToggleSelect={() => toggleSongSelection(song.id)}
                onEdit={() => setEditingSongId(song.id)}
              />
            ))}
          </div>

          {library.nextCursor ? (
            <div className="suno-page__load-more">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  void library.loadMore();
                }}
                disabled={library.loadingMore}
              >
                {library.loadingMore ? t('status.loadingMore') : t('status.loadMore')}
              </button>
            </div>
          ) : null}
        </div>

        {editingSong ? (
          <SongEditor
            key={editingSong.id}
            song={editingSong}
            getIdToken={getIdToken}
            onClose={() => setEditingSongId(null)}
            onSaved={library.replaceSong}
          />
        ) : null}
      </AppShell>
    </RequireAuth>
  );
}
