import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { useTranslation } from '@/context/I18nContext';
import { DEFAULT_CHARACTER_AVATAR } from '@/lib/constants';
import { buildCharacterInstructions } from '@/lib/characterPrompt';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export type CharacterVisibility = 'private' | 'unlisted' | 'public';
export type CharacterGender = 'male' | 'female' | 'none';

const categoryOptions = [
  'Helpers',
  'Game Characters',
  'Games',
  'Anime',
  'VTuber',
  'Books',
  'Movies & TV',
  'Animals',
  'Philosophy',
  'Politics'
];

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
  const [categoryInput, setCategoryInput] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    character.avatarUrl ?? DEFAULT_CHARACTER_AVATAR
  );
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormState({
      name: character.name,
      summary: character.summary,
      greeting: character.greeting,
      longDescription: character.longDescription,
      visibility: character.visibility,
      categories: character.categories ?? [],
      gender: character.gender ?? 'none'
    });
    setAvatarPreview(character.avatarUrl ?? DEFAULT_CHARACTER_AVATAR);
    setAvatarFile(null);
    setCategoryInput('');
    setAvatarError(null);
    setAvatarRemoved(false);
  }, [character]);

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

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setAvatarError(null);
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setAvatarError(t('errors.avatarType'));
      setAvatarFile(null);
      setAvatarPreview(DEFAULT_CHARACTER_AVATAR);
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError(t('errors.avatarSize'));
      setAvatarFile(null);
      setAvatarPreview(DEFAULT_CHARACTER_AVATAR);
      return;
    }

    setAvatarError(null);
    setAvatarFile(file);
    setAvatarRemoved(false);

    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddCategory = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    setFormState(prev => {
      if (prev.categories.includes(trimmed)) {
        return prev;
      }

      return {
        ...prev,
        categories: [...prev.categories, trimmed]
      };
    });
  };

  const handleRemoveCategory = (value: string) => {
    setFormState(prev => ({
      ...prev,
      categories: prev.categories.filter(category => category !== value)
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

    setAvatarError(null);
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

    if (avatarFile) {
      formData.append('avatar', avatarFile);
    } else if (avatarRemoved) {
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
              maxLength={280}
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
              maxLength={300}
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
              minLength={10}
              required
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
                    src={avatarPreview ?? DEFAULT_CHARACTER_AVATAR}
                    alt={formState.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                }
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarChange}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="dashboard-card__button dashboard-card__button--primary"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isSubmitting}
                >
                  {t('form.avatarUpload')}
                </button>
                <button
                  type="button"
                  className="dashboard-card__button"
                  onClick={() => {
                    if (avatarInputRef.current) {
                      avatarInputRef.current.value = '';
                    }
                    setAvatarPreview(DEFAULT_CHARACTER_AVATAR);
                    setAvatarFile(null);
                    setAvatarError(null);
                    setAvatarRemoved(true);
                  }}
                  disabled={isSubmitting}
                >
                  {t('form.avatarReset')}
                </button>
              </div>
              {avatarError ? (
                <p className="dashboard-panel__error" style={{ marginTop: 8 }}>
                  {avatarError}
                </p>
              ) : null}
            </div>
          </div>

          <div className="cai-form-section">
            <label htmlFor="categories">{t('labels.categories')}</label>
            <div className="cai-selected-tags">
              {formState.categories.map(category => (
                <div key={category} className="cai-selected-tag">
                  {category}
                  <button
                    type="button"
                    aria-label={t('categoryTagRemove')}
                    onClick={() => handleRemoveCategory(category)}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
            <input
              id="categories"
              type="text"
              value={categoryInput}
              onChange={event => setCategoryInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAddCategory(categoryInput);
                  setCategoryInput('');
                }
              }}
              placeholder={t('placeholders.categoryInput')}
              disabled={isSubmitting}
            />
            <div className="cai-category-tags">
              {categoryOptions.map(option => (
                <button
                  key={option}
                  type="button"
                  className={`cai-category-tag ${
                    formState.categories.includes(option) ? 'active' : ''
                  }`}
                  onClick={() => handleAddCategory(option)}
                  disabled={isSubmitting}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

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
