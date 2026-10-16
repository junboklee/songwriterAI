import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useTranslation } from '@/context/I18nContext';
import { copyText } from '@/lib/clipboard';
import type { SongEntry } from '@/types/suno';

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
});

const metaString = (song: SongEntry, key: string) => {
  const value = song.metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

// What the card shows from a song's metadata; internal fields (storedAt etc.) stay hidden.
export const songDetails = (song: SongEntry) => ({
  style: metaString(song, 'style'),
  characterName: metaString(song, 'characterName'),
  fromChat: song.metadata?.source === 'auto-from-chat'
});

type SongCardProps = {
  song: SongEntry;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
};

export function SongCard({ song, selected, onToggleSelect, onEdit }: SongCardProps) {
  const { t } = useTranslation('suno');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const { style, characterName, fromChat } = songDetails(song);
  const created = song.createdAt ? new Date(song.createdAt) : null;
  const createdAt = created && !Number.isNaN(created.getTime()) ? dateFormatter.format(created) : null;

  useEffect(() => {
    if (copyState === 'idle') {
      return undefined;
    }
    const timer = window.setTimeout(() => setCopyState('idle'), 2000);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const handleCopy = async () => {
    const title = song.title?.trim() || t('card.untitled');
    const lyrics = song.lyrics?.trim() || t('card.noLyrics');
    setCopyState((await copyText(`${title}\n\n${lyrics}`)) ? 'copied' : 'failed');
  };

  return (
    <article className="suno-card">
      <header className="suno-card__header">
        <div className="suno-card__header-left">
          <input
            type="checkbox"
            className="suno-card__checkbox"
            aria-label={t('card.selectLabel')}
            checked={selected}
            onChange={onToggleSelect}
          />
          <div>
            <p className="suno-card__title">{song.title || t('card.untitled')}</p>
            {createdAt ? <span className="suno-card__timestamp">{createdAt}</span> : null}
          </div>
        </div>
        {characterName ? <span className="suno-card__badge">{characterName}</span> : null}
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

      {style ? (
        <section className="suno-card__section">
          <h3>{t('card.style')}</h3>
          <p className="suno-card__prompt" style={{ margin: 0 }}>
            {style}
          </p>
        </section>
      ) : null}

      <footer className="suno-card__footer">
        {song.threadId ? (
          <Link
            className="suno-card__thread"
            href={{
              pathname: '/chat',
              query: song.characterId
                ? { threadId: song.threadId, characterId: song.characterId }
                : { threadId: song.threadId }
            }}
            title={fromChat ? t('card.fromChat') : undefined}
          >
            {t('card.openChat')}
          </Link>
        ) : null}
        <button type="button" className="btn btn--ghost suno-card__share" onClick={onEdit}>
          {t('card.edit', { replacements: { count: song.versionCount || 1 } })}
        </button>
        <button
          type="button"
          className="btn btn--ghost suno-card__share"
          onClick={() => {
            void handleCopy();
          }}
        >
          {copyState === 'copied' ? t('card.copied') : copyState === 'failed' ? t('card.copyFailed') : t('card.copy')}
        </button>
      </footer>
    </article>
  );
}
