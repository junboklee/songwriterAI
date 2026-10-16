import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';

import { trackEvent } from '@/lib/analytics';
import { authedJson, errorMessage } from '@/lib/authedFetch';
import type { SongEntry } from '@/types/suno';

type SongsPayload = { songs?: SongEntry[]; nextCursor?: unknown };

const parsePage = (payload: SongsPayload | null) => ({
  songs: Array.isArray(payload?.songs) ? payload.songs : [],
  nextCursor:
    typeof payload?.nextCursor === 'number' && Number.isFinite(payload.nextCursor) ? String(payload.nextCursor) : null
});

type LibraryText = { loadError: string; deleteError: string; saveError: string; sessionExpired: string };

export type NewSong = { title: string | null; prompt: string | null; lyrics: string };

// The user's saved songs (/api/profile/songs): paged loading, manual saves, edits and deletion.
export function useSongLibrary(user: User | null, text: LibraryText) {
  const [songs, setSongs] = useState<SongEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const { loadError, deleteError, saveError, sessionExpired } = text;

  useEffect(() => {
    if (!user) {
      setSongs([]);
      setNextCursor(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    authedJson<SongsPayload>(user, '/api/profile/songs', loadError)
      .then(payload => {
        if (!cancelled) {
          const page = parsePage(payload);
          setSongs(page.songs);
          setNextCursor(page.nextCursor);
        }
      })
      .catch(fetchError => {
        if (!cancelled) {
          setError(errorMessage(fetchError, loadError));
          setNextCursor(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, loadError]);

  const loadMore = async () => {
    if (!user || !nextCursor || loadingMore) {
      return;
    }
    setLoadingMore(true);
    setError(null);
    try {
      const page = parsePage(
        await authedJson<SongsPayload>(user, `/api/profile/songs?cursor=${encodeURIComponent(nextCursor)}`, loadError)
      );
      setSongs(prev => [...prev, ...page.songs.filter(song => !prev.some(existing => existing.id === song.id))]);
      setNextCursor(page.nextCursor);
    } catch (fetchError) {
      setError(errorMessage(fetchError, loadError));
    } finally {
      setLoadingMore(false);
    }
  };

  // Throws on failure so the form can show the message.
  const createSong = async (song: NewSong) => {
    if (!user) {
      throw new Error(sessionExpired);
    }
    const payload = await authedJson<{ song?: SongEntry }>(user, '/api/profile/songs', saveError, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(song)
    });
    const created = payload?.song;
    if (created) {
      setSongs(prev => [created, ...prev]);
    }
    trackEvent('song_saved', { source: 'manual', revised: false });
  };

  // Deletes the given songs, or every song with 'all'. Returns false (and shows the error) on failure.
  const deleteSongs = async (target: string[] | 'all') => {
    if (!user) {
      setError(deleteError);
      return false;
    }
    try {
      await authedJson(user, '/api/profile/songs', deleteError, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target === 'all' ? { deleteAll: true } : { ids: target })
      });
      setSongs(prev => (target === 'all' ? [] : prev.filter(song => !target.includes(song.id))));
      if (target === 'all') {
        setNextCursor(null);
      }
      return true;
    } catch (removeError) {
      console.error('Failed to delete songs', removeError);
      setError(errorMessage(removeError, deleteError));
      return false;
    }
  };

  const replaceSong = useCallback((updated: SongEntry) => {
    setSongs(prev => prev.map(song => (song.id === updated.id ? updated : song)));
  }, []);

  return { songs, loading, loadingMore, error, nextCursor, loadMore, createSong, deleteSongs, replaceSong };
}
