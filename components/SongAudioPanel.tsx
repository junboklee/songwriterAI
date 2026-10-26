import { useEffect, useRef, useState } from 'react';

import { useTranslation } from '@/context/I18nContext';
import { trackEvent } from '@/lib/analytics';
import { confirmIdentityOnServer, identityVerificationAvailable, requestIdentityVerification } from '@/lib/portone';

type AudioItem = {
  id: string;
  length: 'clip' | 'full';
  createdAt: string | null;
};

// Mirrors lib/music/access.ts.
type Access = 'unlimited' | 'closed' | 'needsIdentity' | 'free' | 'freeUsed';

type SongAudioPanelProps = {
  songId: string;
  getIdToken: () => Promise<string>;
  // Songs are made from the saved lyrics, so unsaved edits must be saved first.
  dirty: boolean;
};

const base = (songId: string) => `/api/profile/songs/${encodeURIComponent(songId)}/audio`;

// Sings the saved lyrics with AI (Lyria). Hidden while the feature is closed to this account and the
// song has no audio; otherwise shows what the account may do (lib/music/access.ts).
export function SongAudioPanel({ songId, getIdToken, dirty }: SongAudioPanelProps) {
  const { t } = useTranslation('songEditor');
  const [access, setAccess] = useState<Access>('closed');
  const [reload, setReload] = useState(0);
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
        setAccess(payload.access ?? (payload.canGenerate ? 'unlimited' : 'closed'));
        setItems(Array.isArray(payload.items) ? payload.items : []);
      }
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [getIdToken, songId, reload]);

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

  // 본인인증 opens PortOne's window; on mobile PortOne redirects to /verify/identity instead.
  const verifyIdentity = async () => {
    setError(null);
    trackEvent('identity_verification_started');
    try {
      const result = await requestIdentityVerification(getIdToken, `${window.location.origin}/verify/identity`);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      const confirmed = await confirmIdentityOnServer(getIdToken, result.identityVerificationId);
      if (!confirmed.ok) {
        setError(confirmed.message);
        return;
      }
      setReload(value => value + 1);
    } catch {
      setError(t('audioError'));
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

  if (access === 'closed' && items.length === 0) {
    return null;
  }
  const lengths = access === 'unlimited' ? (['clip', 'full'] as const) : (['clip'] as const);

  return (
    <section className="song-audio" aria-label={t('audioTitle')}>
      <div className="song-audio__header">
        <h3>{t('audioTitle')}</h3>
        <span className="song-audio__badge">{t('audioAiLabel')}</span>
      </div>
      {access === 'needsIdentity' ? (
        <>
          <p className="song-editor__hint">{t('audioNeedsIdentity')}</p>
          {identityVerificationAvailable() ? (
            <div className="song-editor__actions">
              <button type="button" className="btn btn--primary" onClick={() => void verifyIdentity()}>
                {t('audioVerify')}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
      {access === 'freeUsed' ? <p className="song-editor__hint">{t('audioFreeUsed')}</p> : null}
      {access === 'unlimited' || access === 'free' ? (
        <>
          <p className="song-editor__hint">
            {dirty ? t('audioSaveFirst') : t(access === 'free' ? 'audioFreeHint' : 'audioHint')}
          </p>
          <div className="song-editor__actions">
            {lengths.map(length => (
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
