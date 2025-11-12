import Link from 'next/link';
import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

import { AppNav } from '@/components/AppNav';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';
import { DEFAULT_CHARACTER_AVATAR } from '@/lib/constants';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

type VisibilityOption = 'private' | 'unlisted' | 'public';

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

const visibilityDescriptors: Array<{
  value: VisibilityOption;
  titleKey: string;
  descriptionKey: string;
}> = [
  {
    value: 'public',
    titleKey: 'visibilityOptions.public.title',
    descriptionKey: 'visibilityOptions.public.description'
  },
  {
    value: 'unlisted',
    titleKey: 'visibilityOptions.unlisted.title',
    descriptionKey: 'visibilityOptions.unlisted.description'
  },
  {
    value: 'private',
    titleKey: 'visibilityOptions.private.title',
    descriptionKey: 'visibilityOptions.private.description'
  }
];

export default function CharacterEdit() {
  const router = useRouter();
  const { user } = useAuth();
  const characterIdParam = router.query.id;
  const characterId = Array.isArray(characterIdParam) ? characterIdParam[0] : characterIdParam;

  const { t: tEdit } = useTranslation('characterEdit');
  const { t } = useTranslation('characterCreate');

  const [name, setName] = useState('');
  const [greeting, setGreeting] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState('');
  const [visibility, setVisibility] = useState<VisibilityOption>('public');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(DEFAULT_CHARACTER_AVATAR);
  const [avatarRemoved, setAvatarRemoved] = useState(false); // New state variable
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user || !characterId) {
      return;
    }

    let cancelled = false;

    const fetchCharacter = async () => {
      setLoading(true);
      setError(null);
      setAvatarRemoved(false); // Reset avatarRemoved on fetch

      try {
        const idToken = await user.getIdToken();
        const response = await fetch(`/api/profile/characters/${characterId}`, {
          headers: {
            Authorization: `Bearer ${idToken}`
          }
        });

        if (!response.ok) {
          throw new Error(tEdit('loadError'));
        }

        const { character } = await response.json();
        if (cancelled) {
          return;
        }

        setName(character.name ?? '');
        setGreeting(character.greeting ?? '');
        setShortDescription(character.shortDescription ?? '');
        setLongDescription(character.longDescription ?? '');
        setCategories(Array.isArray(character.categories) ? character.categories : []);
        setVisibility(character.visibility ?? 'public');
        setAvatarPreview(
          character.avatarUrl && character.avatarUrl.trim()
            ? character.avatarUrl
            : DEFAULT_CHARACTER_AVATAR
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : tEdit('loadError'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchCharacter();

    return () => {
      cancelled = true;
    };
  }, [characterId, tEdit, user]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(DEFAULT_CHARACTER_AVATAR);
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError(tEdit('errors.avatarType'));
      setAvatarFile(null);
      setAvatarPreview(DEFAULT_CHARACTER_AVATAR);
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setError(tEdit('errors.avatarSize'));
      setAvatarFile(null);
      setAvatarPreview(DEFAULT_CHARACTER_AVATAR);
      return;
    }

    setError(null);
    setAvatarFile(file);

    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!user) {
      setError(tEdit('sessionExpired'));
      return;
    }

    if (!characterId) {
      setError(tEdit('loadError'));
      return;
    }

    if (!name.trim()) {
      setError(tEdit('missingName'));
      return;
    }

    setSaving(true);

    try {
      const idToken = await user.getIdToken();
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('greeting', greeting);
      formData.append('shortDescription', shortDescription);
      formData.append('longDescription', longDescription);
      formData.append('visibility', visibility);
      formData.append('categories', JSON.stringify(categories));
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      } else if (avatarRemoved) {
        // Explicitly tell the backend to remove the avatar
        formData.append('avatarRemoved', 'true');
      }

      const response = await fetch(`/api/profile/characters/${characterId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${idToken}`
        },
        body: formData
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          (payload && typeof payload.error === 'string' && payload.error) || tEdit('loadError');
        throw new Error(message);
      }

      setSuccessMessage(tEdit('saveSuccess'));
    } catch (err) {
      setError(err instanceof Error ? err.message : tEdit('loadError'));
    } finally {
      setSaving(false);
    }
  };

  const greetingCountLabel = t('form.greetingCount', { replacements: { count: greeting.length } });
  const longDescriptionCount = t('form.longDescriptionCount', {
    replacements: { count: longDescription.length }
  });

  return (
    <RequireAuth>
      <div className="cai-create-page">
        <AppNav
          actions={
            <>
              <Link href="/dashboard" className="cai-btn cai-btn-ghost">
                {t('sidebarBack')}
              </Link>
              <button
                form="character-edit-form"
                type="submit"
                className="cai-btn cai-btn-primary"
                disabled={saving || loading}
              >
                {saving ? t('form.submitting') : t('form.submit')}
              </button>
            </>
          }
        />

        <main className="cai-create-main">
          <header className="cai-create-hero">
            <h1>{tEdit('pageTitle')}</h1>
            <p>{t('form.description')}</p>
          </header>

          <form id="character-edit-form" className="cai-form" onSubmit={handleSubmit}>
            <div className="cai-form-section">
              <label htmlFor="name">{t('form.name')}</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder={t('form.namePlaceholder')}
                required
                disabled={loading || saving}
              />
            </div>

            <div className="cai-form-section">
              <label htmlFor="greeting">{t('form.greeting')}</label>
              <textarea
                id="greeting"
                value={greeting}
                onChange={event => setGreeting(event.target.value)}
                placeholder={t('form.greetingPlaceholder')}
                disabled={loading || saving}
              />
              <p className="cai-char-count">{greetingCountLabel}</p>
            </div>

            <div className="cai-form-section">
              <label htmlFor="shortDescription">{t('form.shortDescription')}</label>
              <input
                id="shortDescription"
                type="text"
                value={shortDescription}
                onChange={event => setShortDescription(event.target.value)}
                placeholder={t('form.shortDescriptionPlaceholder')}
                disabled={loading || saving}
              />
            </div>

            <div className="cai-form-section">
              <label htmlFor="longDescription">{t('form.longDescription')}</label>
              <textarea
                id="longDescription"
                value={longDescription}
                onChange={event => setLongDescription(event.target.value)}
                placeholder={t('form.longDescriptionPlaceholder')}
                disabled={loading || saving}
              />
              <p className="cai-char-count">{longDescriptionCount}</p>
            </div>

            <div className="cai-form-section">
              <label className="cai-form-label">{t('form.avatar')}</label>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 18,
                    overflow: 'hidden',
                    background: 'rgba(255, 255, 255, 0.04)',
                    display: 'grid',
                    placeItems: 'center'
                  }}
                >
                  {
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarPreview ?? DEFAULT_CHARACTER_AVATAR}
                      alt={name || 'avatar preview'}
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
                    disabled={saving}
                  />
                  <button
                    type="button"
                    className="cai-btn cai-btn-primary"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={saving}
                  >
                    {t('form.avatarUpload')}
                  </button>
                  <button
                    type="button"
                    className="cai-btn cai-btn-ghost"
                    onClick={() => {
                      setAvatarPreview(DEFAULT_CHARACTER_AVATAR);
                      setAvatarFile(null);
                      setAvatarRemoved(true); // Set avatarRemoved to true
                    }}
                    disabled={saving}
                  >
                    {t('form.avatarReset')}
                  </button>
                </div>
              </div>
            </div>

            <div className="cai-form-section">
              <label htmlFor="categories">{t('form.categories')}</label>
              <div className="cai-selected-tags">
                {categories.map(category => (
                  <div key={category} className="cai-selected-tag">
                    {category}
                    <button
                      type="button"
                      onClick={() =>
                        setCategories(previous => previous.filter(item => item !== category))
                      }
                      disabled={saving}
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
                  if (event.key === 'Enter' && categoryInput.trim()) {
                    event.preventDefault();
                    const nextCategory = categoryInput.trim();
                    if (!categories.includes(nextCategory)) {
                      setCategories(prev => [...prev, nextCategory]);
                    }
                    setCategoryInput('');
                  }
                }}
                placeholder={t('form.categoryPlaceholder')}
                disabled={saving}
              />
              <div className="cai-category-tags">
                {categoryOptions.map(option => (
                  <button
                    key={option}
                    type="button"
                    className={`cai-category-tag ${categories.includes(option) ? 'active' : ''}`}
                    onClick={() => {
                      if (!categories.includes(option)) {
                        setCategories(prev => [...prev, option]);
                      }
                    }}
                    disabled={saving}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="cai-form-section">
              <label className="cai-form-label">{t('form.visibility')}</label>
              <div className="cai-visibility-options">
                {visibilityDescriptors.map(option => (
                  <label
                    key={option.value}
                    className={`cai-visibility-option ${
                      visibility === option.value ? 'active' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={option.value}
                      checked={visibility === option.value}
                      onChange={() => setVisibility(option.value)}
                      disabled={saving}
                    />
                    <div className="cai-visibility-info">
                      <strong>{t(option.titleKey)}</strong>
                      <p>{t(option.descriptionKey)}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="cai-form-actions">
              <Link href="/dashboard" className="cai-btn cai-btn-ghost">
                {t('sidebarCancel')}
              </Link>
              <button type="submit" className="cai-btn cai-btn-primary" disabled={saving}>
                {saving ? t('form.submitting') : t('form.submit')}
              </button>
            </div>
          </form>

          {error ? <p className="cai-form-error">{error}</p> : null}
          {successMessage ? <p className="cai-form-success">{successMessage}</p> : null}
        </main>
      </div>
    </RequireAuth>
  );
}
