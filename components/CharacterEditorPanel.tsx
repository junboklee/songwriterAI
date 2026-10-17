import { ChangeEvent, FormEvent, useMemo, useState } from 'react';

import { CategoryPicker } from '@/components/character/CategoryPicker';
import { useTranslation } from '@/context/I18nContext';
import { useAvatarPicker } from '@/hooks/useAvatarPicker';
import { CHARACTER_LIMITS } from '@/lib/characterFields';
import { buildCharacterInstructions } from '@/lib/characterPrompt';

export type CharacterVisibility = 'private' | 'unlisted' | 'public';
export type CharacterGender = 'male' | 'female' | 'none';

type FormState = {
  name: string;
  summary: string;
  greeting: string;
  longDescription: string;
  visibility: CharacterVisibility;
  categories: string[];
  gender: CharacterGender;
};

type CharacterEditorPanelProps = {
  character: {
    id: string;
    name: string;
    summary: string;
    greeting: string;
    longDescription: string;
    visibility: CharacterVisibility;
    avatarUrl?: string | null;
    categories?: string[];
    gender?: CharacterGender;
  };
  onClose: () => void;
  onSubmit: (payload: FormData) => void;
  isSubmitting?: boolean;
  errorMessage?: string | null;
};

const VISIBILITY_VALUES: CharacterVisibility[] = ['private', 'unlisted', 'public'];
const GENDER_VALUES: CharacterGender[] = ['male', 'female', 'none'];

// The form keeps its own copy of the character; render it with key={character.id} so a different
// character starts fresh while parent re-renders (e.g. while saving) never wipe what was typed.

export default function CharacterEditorPanel({
  character,
  onClose,
  onSubmit,
  isSubmitting = false,
  errorMessage = null
}: CharacterEditorPanelProps) {
  const { t } = useTranslation('characterEditor');
  const { t: tCommon } = useTranslation('common');

  const [formState, setFormState] = useState<FormState>({
    name: character.name,
    summary: character.summary,
    greeting: character.greeting,
    longDescription: character.longDescription,
    visibility: character.visibility,
    categories: character.categories ?? [],
    gender: character.gender ?? 'none'
  });
  const avatar = useAvatarPicker(character.avatarUrl, {
    invalidType: t('errors.avatarType'),
    tooLarge: t('errors.avatarSize')
  });

  const handleChange =
    <Key extends keyof FormState>(key: Key) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      if (key === 'categories') {
        return;
      }

      setFormState(prev => ({
        ...prev,
        [key]: event.target.value
      }));
    };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = formState.name.trim();
    if (!trimmedName) {
      return;
    }

    const trimmedSummary = formState.summary.trim();
    const trimmedGreeting = formState.greeting.trim();
    const trimmedLong = formState.longDescription.trim();

    const instructions = buildCharacterInstructions({
      name: trimmedName,
      shortDescription: trimmedSummary,
      greeting: trimmedGreeting,
      longDescription: trimmedLong
    });

    const formData = new FormData();
    formData.append('id', character.id);
    formData.append('name', trimmedName);
    formData.append('shortDescription', trimmedSummary);
    formData.append('greeting', trimmedGreeting);
    formData.append('longDescription', trimmedLong);
    formData.append('instructions', instructions);
    formData.append('visibility', formState.visibility);
    formData.append('gender', formState.gender);
    formData.append('categories', JSON.stringify(formState.categories));

    if (avatar.file) {
      formData.append('avatar', avatar.file);
    } else if (avatar.removed) {
      formData.append('avatarRemoved', 'true');
    }

    onSubmit(formData);
  };

  const instructionsPreview = useMemo(
    () =>
      buildCharacterInstructions({
        name: formState.name || character.name,
        shortDescription: formState.summary,
        greeting: formState.greeting,
        longDescription: formState.longDescription
      }),
    [character.name, formState.greeting, formState.longDescription, formState.name, formState.summary]
  );

  const submitLabel = isSubmitting ? t('submitting') : t('submit');

  return (
    <div className="dashboard-panel-backdrop" role="dialog" aria-modal="true">
      <div className="dashboard-panel glass-panel" aria-busy={isSubmitting}>
        <header className="dashboard-panel__header">
          <h2 className="dashboard-panel__title">{t('title')}</h2>
          <button
            type="button"
            className="dashboard-panel__close"
            aria-label={t('closePanel')}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <form className="dashboard-panel__form" onSubmit={handleSubmit}>
          <div className="dashboard-panel__field">
            <label htmlFor="character-name" className="dashboard-panel__label">
              {t('labels.name')}
            </label>
            <input
              id="character-name"
              type="text"
              className="dashboard-panel__input"
              value={formState.name}
              onChange={handleChange('name')}
              placeholder={t('placeholders.name')}
              maxLength={CHARACTER_LIMITS.name}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="dashboard-panel__field">
            <label htmlFor="character-gender" className="dashboard-panel__label">
              {t('labels.gender')}
            </label>
            <select
              id="character-gender"
              className="dashboard-panel__input"
              value={formState.gender}
              onChange={handleChange('gender')}
              disabled={isSubmitting}
            >
              {GENDER_VALUES.map(option => (
                <option key={option} value={option}>
                  {t(`genderOptions.${option}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="dashboard-panel__field">
            <label htmlFor="character-summary" className="dashboard-panel__label">
              {t('labels.summary')}
            </label>
            <textarea
              id="character-summary"
              className="dashboard-panel__textarea"
              value={formState.summary}
              onChange={handleChange('summary')}
              placeholder={t('placeholders.summary')}
              maxLength={CHARACTER_LIMITS.shortDescription}
              disabled={isSubmitting}
            />
          </div>

          <div className="dashboard-panel__field">
            <label htmlFor="character-greeting" className="dashboard-panel__label">
              {t('labels.greeting')}
            </label>
            <textarea
              id="character-greeting"
              className="dashboard-panel__textarea"
              value={formState.greeting}
              onChange={handleChange('greeting')}
              placeholder={t('placeholders.greeting')}
              maxLength={CHARACTER_LIMITS.greeting}
              disabled={isSubmitting}
            />
          </div>

          <div className="dashboard-panel__field">
            <label htmlFor="character-long-description" className="dashboard-panel__label">
              {t('labels.longDescription')}
            </label>
            <textarea
              id="character-long-description"
              className="dashboard-panel__textarea"
              value={formState.longDescription}
              onChange={handleChange('longDescription')}
              placeholder={t('placeholders.longDescription')}
              maxLength={CHARACTER_LIMITS.longDescription}
              disabled={isSubmitting}
            />
            <p className="dashboard-panel__hint">{t('hints.longDescription')}</p>
          </div>

          <div className="dashboard-panel__field">
            <label htmlFor="character-instructions-preview" className="dashboard-panel__label">
              {t('labels.instructions')}
            </label>
            <textarea
              id="character-instructions-preview"
              className="dashboard-panel__textarea dashboard-panel__textarea--readonly"
              value={instructionsPreview}
              readOnly
            />
            <p className="dashboard-panel__hint">{t('hints.instructions')}</p>
          </div>

          <div className="dashboard-panel__field">
            <label className="dashboard-panel__label">{t('form.avatar')}</label>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  overflow: 'hidden',
                  background: 'rgba(255, 255, 255, 0.04)',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 600
                }}
              >
                {
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar.preview}
                    alt={formState.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                }
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  ref={avatar.inputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  style={{ display: 'none' }}
                  onChange={avatar.onChange}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="dashboard-card__button dashboard-card__button--primary"
                  onClick={avatar.open}
                  disabled={isSubmitting}
                >
                  {t('form.avatarUpload')}
                </button>
                <button
                  type="button"
                  className="dashboard-card__button"
                  onClick={avatar.reset}
                  disabled={isSubmitting}
                >
                  {t('form.avatarReset')}
                </button>
              </div>
              {avatar.error ? (
                <p className="dashboard-panel__error" style={{ marginTop: 8 }}>
                  {avatar.error}
                </p>
              ) : null}
            </div>
          </div>

          <CategoryPicker
            inputId="categories"
            label={t('labels.categories')}
            placeholder={t('placeholders.categoryInput')}
            removeLabel={t('categoryTagRemove')}
            value={formState.categories}
            onChange={categories => setFormState(prev => ({ ...prev, categories }))}
            disabled={isSubmitting}
          />

          <div className="dashboard-panel__field">
            <label htmlFor="character-visibility" className="dashboard-panel__label">
              {t('labels.visibility')}
            </label>
            <select
              id="character-visibility"
              className="dashboard-panel__select"
              value={formState.visibility}
              onChange={handleChange('visibility')}
              disabled={isSubmitting}
            >
              {VISIBILITY_VALUES.map(value => (
                <option key={value} value={value}>
                  {t(`visibility.${value}`)}
                </option>
              ))}
            </select>
          </div>

          {errorMessage ? <p className="dashboard-panel__error">{errorMessage}</p> : null}

          <div className="dashboard-panel__actions">
            <button
              type="button"
              className="dashboard-card__button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              {tCommon('cancel')}
            </button>
            <button type="submit" className="dashboard-panel__submit" disabled={isSubmitting}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
