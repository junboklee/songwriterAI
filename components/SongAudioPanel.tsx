import { useEffect, useRef, useState } from 'react';

import { useTranslation } from '@/context/I18nContext';
import { trackEvent } from '@/lib/analytics';

type AudioItem = {
  id: string;
  length: 'clip' | 'full';
  createdAt: string | null;
};

type SongAudioPanelProps = {
  songId: string;
  getIdToken: () => Promise<string>;
  // Songs are made from the saved lyrics, so unsaved edits must be saved first.
  dirty: boolean;
};

const base = (songId: string) => `/api/profile/songs/${encodeURIComponent(songId)}/audio`;

// Sings the saved lyrics with AI (Lyria). Only shown to accounts the server lets generate
// (admins while the feature is tested) or when the song already has audio.
export function SongAudioPanel({ songId, getIdToken, dirty }: SongAudioPanelProps) {
  const { t } = useTranslation('songEditor');
  const [canGenerate, setCanGenerate] = useState(false);
  const [items, setItems] = useState<AudioItem[]>([]);
  const [busy, setBusy] = useState<'clip' | 'full' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<Record<string, string>>({});
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const response = await fetch(base(songId), { headers: { Authorization: `Bearer ${await getIdToken()}` } });
      const payload = await response.json().catch(() => ({}));
      if (!cancelled && response.ok) {
        setCanGenerate(Boolean(payload.canGenerate));
        setItems(Array.isArray(payload.items) ? payload.items : []);
      }
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [getIdToken, songId]);

  // Object URLs hold the downloaded audio in memory until the editor closes.
  useEffect(() => () => objectUrls.current.forEach(url => URL.revokeObjectURL(url)), []);

  const generate = async (length: 'clip' | 'full') => {
    setBusy(length);
    setError(null);
    trackEvent('song_audio_requested', { length });
    try {
      const response = await fetch(base(songId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getIdToken()}` },
        body: JSON.stringify({ length })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof payload.error === 'string' ? payload.error : t('audioError'));
      }
      setItems(prev => [payload.item, ...prev]);
      await play(payload.item.id);
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : t('audioError'));
    } finally {
      setBusy(null);
    }
  };

  const play = async (audioId: string) => {
    if (players[audioId]) {
      return;
    }
    const response = await fetch(`${base(songId)}/${encodeURIComponent(audioId)}`, {
      headers: { Authorization: `Bearer ${await getIdToken()}` }
    });
    if (!response.ok) {
      setError(t('audioError'));
      return;
    }
    const url = URL.createObjectURL(await response.blob());
    objectUrls.current.push(url);
    setPlayers(prev => ({ ...prev, [audioId]: url }));
  };

  if (!canGenerate && items.length === 0) {
    return null;
  }

  return (
    <section className="song-audio" aria-label={t('audioTitle')}>
      <div className="song-audio__header">
        <h3>{t('audioTitle')}</h3>
        <span className="song-audio__badge">{t('audioAiLabel')}</span>
      </div>
      {canGenerate ? (
        <>
          <p className="song-editor__hint">{dirty ? t('audioSaveFirst') : t('audioHint')}</p>
          <div className="song-editor__actions">
            {(['clip', 'full'] as const).map(length => (
              <button
                key={length}
                type="button"
                className={length === 'clip' ? 'btn btn--primary' : 'btn btn--ghost'}
                disabled={busy !== null || dirty}
                onClick={() => void generate(length)}
              >
                {busy === length ? t('audioBusy') : t(length === 'clip' ? 'audioClip' : 'audioFull')}
              </button>
            ))}
          </div>
        </>
      ) : null}
      {error ? <p className="lyrics-rewrite__error">{error}</p> : null}
      <ul className="song-audio__list">
        {items.map(item => (
          <li key={item.id}>
            <span>
              {t(item.length === 'full' ? 'audioFullLabel' : 'audioClipLabel')}
              {item.createdAt ? ` · ${new Date(item.createdAt).toLocaleString()}` : ''}
            </span>
            {players[item.id] ? (
              <audio controls autoPlay src={players[item.id]} />
            ) : (
              <button type="button" className="btn btn--ghost" onClick={() => void play(item.id)}>
                {t('audioPlay')}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
