import { useState, type FormEvent } from 'react';

import { useTranslation } from '@/context/I18nContext';
import type { NewSong } from '@/hooks/useSongLibrary';
import { errorMessage } from '@/lib/authedFetch';

type NewSongFormProps = {
  // Throws with a user-facing message when saving fails.
  onCreate: (song: NewSong) => Promise<void>;
};

// Form for saving lyrics written outside the chat.
export function NewSongForm({ onCreate }: NewSongFormProps) {
  const { t } = useTranslation('suno');
  const [title, setTitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedLyrics = lyrics.trim();
    if (!trimmedLyrics) {
      setStatus({ kind: 'error', message: t('form.lyricsRequired') });
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      await onCreate({ title: title.trim() || null, prompt: prompt.trim() || null, lyrics: trimmedLyrics });
      setTitle('');
      setPrompt('');
      setLyrics('');
      setStatus({ kind: 'success', message: t('form.success') });
    } catch (saveError) {
      setStatus({ kind: 'error', message: errorMessage(saveError, t('form.error')) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      className="glass-panel suno-new-form"
      onSubmit={event => {
        void handleSubmit(event);
      }}
      style={{ marginTop: 24, display: 'grid', gap: 16 }}
    >
      <div style={{ display: 'grid', gap: 12 }}>
        <label className="suno-form__label" style={{ display: 'grid', gap: 6 }}>
          <span>{t('form.titleLabel')}</span>
          <input
            type="text"
            className="suno-form__input"
            value={title}
            onChange={event => setTitle(event.target.value)}
            placeholder={t('form.titlePlaceholder')}
          />
        </label>
        <label className="suno-form__label" style={{ display: 'grid', gap: 6 }}>
          <span>{t('form.promptLabel')}</span>
          <textarea
            className="suno-form__textarea"
            value={prompt}
            onChange={event => setPrompt(event.target.value)}
            placeholder={t('form.promptPlaceholder')}
            rows={3}
          />
        </label>
        <label className="suno-form__label" style={{ display: 'grid', gap: 6 }}>
          <span>{t('form.lyricsLabel')}</span>
          <textarea
            className="suno-form__textarea"
            value={lyrics}
            onChange={event => setLyrics(event.target.value)}
            placeholder={t('form.lyricsPlaceholder')}
            rows={5}
            required
          />
        </label>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="submit" className="btn btn--primary" disabled={saving}>
          {saving ? t('form.saving') : t('form.save')}
        </button>
        {status ? (
          <span
            role="status"
            className={`suno-form__status suno-form__status--${status.kind}`}
            style={{ fontSize: '0.85rem', color: status.kind === 'success' ? '#6ee7b7' : 'var(--danger)' }}
          >
            {status.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
