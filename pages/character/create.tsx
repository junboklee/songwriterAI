import Link from 'next/link';
import { ChangeEvent, FormEvent, useRef, useState } from 'react';
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

export default function CharacterCreate() {
  const router = useRouter();
  const { user } = useAuth();
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setAvatarFile(null);
      setAvatarPreview(DEFAULT_CHARACTER_AVATAR);
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError(t('errors.avatarType'));
      setAvatarPreview(DEFAULT_CHARACTER_AVATAR);
      setAvatarFile(null);
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setError(t('errors.avatarSize'));
      setAvatarPreview(DEFAULT_CHARACTER_AVATAR);
      setAvatarFile(null);
      return;
    }

    setError(null);
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!user) {
      setError(t('sessionExpired'));
      return;
    }

    if (!name.trim()) {
      setError(t('missingName'));
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
      }

      const response = await fetch('/api/characters', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`
        },
        body: formData
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          (payload && typeof payload.error === 'string' && payload.error) || t('error');
        throw new Error(message);
      }

      setSuccessMessage(t('saveSuccess'));
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
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
              <Link href="/dashboard" className="btn btn--ghost">
                대시보드로 돌아가기
              </Link>
              <button
                form="character-create-form"
                type="submit"
                className="btn btn--primary"
                disabled={saving}
              >
                {saving ? '캐릭터 생성 중...' : '캐릭터 생성'}
              </button>
            </>
          }
        />

        <main className="cai-create-main">
          <header className="cai-create-hero">
            <h1>{t('form.heroTitle')}</h1>
            <p>{t('form.description')}</p>
          </header>

          <form id="character-create-form" className="cai-form" onSubmit={handleSubmit}>
            <div className="cai-form-section">
              <label htmlFor="name">{t('form.name')}</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder={t('form.namePlaceholder')}
                required
              />
            </div>

            <div className="cai-form-section">
            <label htmlFor="greeting">{t('form.greeting')}</label>
            <textarea
              id="greeting"
              value={greeting}
              onChange={event => setGreeting(event.target.value)}
              placeholder={t('form.greetingPlaceholder')}
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
              />
            </div>

            <div className="cai-form-section">
              <label htmlFor="longDescription">{t('form.longDescription')}</label>
              <textarea
                id="longDescription"
                value={longDescription}
                onChange={event => setLongDescription(event.target.value)}
                placeholder={t('form.longDescriptionPlaceholder')}
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
