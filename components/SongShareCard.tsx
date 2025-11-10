import { useTranslation } from '@/context/I18nContext';
import type { SongEntry } from '@/types/suno';

type SongShareCardProps = {
  song: SongEntry;
};

const formatDate = (value: string | null, fallback: string) => {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

const computeSnippet = (value: string | null | undefined, fallback: string) => {
  if (!value) {
    return fallback;
  }

  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return fallback;
  }

  return trimmed.length > 180 ? `${trimmed.slice(0, 180)}...` : trimmed;
};

export function SongShareCard({ song }: SongShareCardProps) {
  const { t } = useTranslation('shareCard');

  const dateLabel = formatDate(song.createdAt ?? song.updatedAt, t('dateUnknown'));
  const promptSnippet = song.prompt ? computeSnippet(song.prompt, t('promptEmpty')) : null;
  const lyricsSnippet = computeSnippet(song.lyrics, t('lyricsEmpty'));
  const characterTag = song.characterId
    ? t('characterTag', { replacements: { id: song.characterId } })
    : t('originalTag');
  const threadLabel = song.threadId
    ? t('threadLabel', { replacements: { id: song.threadId.slice(0, 10) } })
    : null;

  return (
    <div className="share-card">
      <div className="share-card__badge">{t('badge')}</div>
      <h3 className="share-card__title">{song.title || t('untitled')}</h3>
      <p className="share-card__date">{dateLabel}</p>
      {promptSnippet ? (
        <div className="share-card__section">
          <h4>{t('promptTitle')}</h4>
          <p>{promptSnippet}</p>
        </div>
      ) : null}
      <div className="share-card__section">
        <h4>{t('lyricsTitle')}</h4>
        <p>{lyricsSnippet}</p>
      </div>
      <div className="share-card__footer">
        <span className="share-card__tag">{characterTag}</span>
        {threadLabel ? <span className="share-card__thread">{threadLabel}</span> : null}
      </div>
    </div>
  );
}

