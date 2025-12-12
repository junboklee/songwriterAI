import Link from 'next/link';
import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import { useRouter } from 'next/router';

import { AppNav } from '@/components/AppNav';
import { AppShell } from '@/components/AppShell';
import { MainSidebar } from '@/components/MainSidebar';
import { RequireAuth } from '@/components/RequireAuth';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';
import { DEFAULT_CHARACTER_AVATAR } from '@/lib/constants';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

type VisibilityOption = 'private' | 'unlisted' | 'public';
type GenderOption = 'male' | 'female' | 'none';

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
  const [visibility, setVisibility] = useState<VisibilityOption>('private');
  const [gender, setGender] = useState<GenderOption>('none');
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
      formData.append('gender', gender);

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

  const heroHighlights = [
    t('form.highlights.persona'),
    t('form.highlights.mood'),
    t('form.highlights.sharing')
  ];

  const tipCards = [
    {
      title: t('form.tips.personaTitle'),
      description: t('form.tips.personaBody')
    },
    {
      title: t('form.tips.visibilityTitle'),
      description: t('form.tips.visibilityBody')
    }
  ];

  const heroStats = [
    { label: t('form.cardStat1'), value: t('form.cardStatValue1') },
    { label: t('form.cardStat2'), value: t('form.cardStatValue2') }
  ];

  const timelineSteps = [
    {
      title: t('form.sections.identityTitle'),
      description: t('form.sections.identitySubtitle')
    },
    {
      title: t('form.sections.storyTitle'),
      description: t('form.sections.storySubtitle')
    },
    {
      title: t('form.sections.avatarTitle'),
      description: t('form.sections.avatarSubtitle')
    },
    {
      title: t('form.sections.visibilityTitle'),
      description: t('form.sections.visibilitySubtitle')
    }
  ];

  return (
    <RequireAuth>
      <AppShell sidebar={<MainSidebar active="dashboard" />}>
        <div className="cai-create-page">
          <AppNav
            actions={
              <>
                <Link href="/dashboard" className="btn btn--ghost">
                  {t('sidebarCancel')}
                </Link>
                <button
                  form="character-create-form"
                  type="submit"
                  className="btn btn--primary"
                  disabled={saving}
                >
                  {saving ? t('form.submitting') : t('form.submit')}
                </button>
              </>
            }
          />

          <main className="cai-create-main">
            <header className="cai-create-hero">
              <div className="cai-hero-grid">
                <div className="cai-hero-copy">
                  <p className="cai-hero-eyebrow">{t('form.heroEyebrow')}</p>
                  <h1>{t('form.heroTitle')}</h1>
                  <p className="cai-hero-description">{t('form.description')}</p>
                  <div className="cai-hero-pills">
                    {heroHighlights.map(item => (
                      <span key={item} className="cai-hero-pill">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="cai-hero-panel">
                  <p className="cai-card-eyebrow">{t('form.cardEyebrow')}</p>
                  <h3>{t('form.cardTitle')}</h3>
                  <p className="cai-card-subtitle">{t('form.cardSubtitle')}</p>
                  <div className="cai-hero-panel__stats">
                    {heroStats.map(stat => (
                      <div key={stat.label} className="cai-hero-panel__stat">
                        <span>{stat.label}</span>
                        <strong>{stat.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </header>

            <section className="cai-create-layout">
              <form id="character-create-form" className="cai-form" onSubmit={handleSubmit}>
                <section className="cai-form-card">
                  <div className="cai-form-card__header cai-form-card__header--center">
                    <p className="cai-form-card__eyebrow">{t('form.sections.identityTitle')}</p>
                    <p className="cai-form-card__subtitle">{t('form.sections.identitySubtitle')}</p>
                  </div>
                  <div className="cai-form-card__body">
                    <div className="cai-form-grid">
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
                        <label htmlFor="gender">{t('form.genderLabel')}</label>
                        <select
                          id="gender"
                          value={gender}
                          onChange={event => setGender(event.target.value as GenderOption)}
                        >
                          <option value="male">{t('form.genderOptions.male')}</option>
                          <option value="female">{t('form.genderOptions.female')}</option>
                          <option value="none">{t('form.genderOptions.none')}</option>
                        </select>
                      </div>

                      <div className="cai-form-section cai-grid-span-2">
                        <label htmlFor="greeting">{t('form.greeting')}</label>
                        <textarea
                          id="greeting"
                          value={greeting}
                          onChange={event => setGreeting(event.target.value)}
                          placeholder={t('form.greetingPlaceholder')}
                        />
                        <p className="cai-char-count">{greetingCountLabel}</p>
                      </div>

                      <div className="cai-form-section cai-grid-span-2 cai-form-section--wide">
                        <label htmlFor="shortDescription">{t('form.shortDescription')}</label>
                        <input
                          id="shortDescription"
                          type="text"
                          value={shortDescription}
                          onChange={event => setShortDescription(event.target.value)}
                          placeholder={t('form.shortDescriptionPlaceholder')}
                        />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="cai-form-card cai-form-card--story">
                  <div className="cai-form-card__header">
                    <p className="cai-form-card__eyebrow">{t('form.sections.storyTitle')}</p>
                    <p className="cai-form-card__subtitle">{t('form.sections.storySubtitle')}</p>
                  </div>
                  <div className="cai-form-card__body">
                    <div className="cai-form-section cai-form-section--story">
                      <label htmlFor="longDescription">{t('form.longDescription')}</label>
                      <textarea
                        id="longDescription"
                        value={longDescription}
                        onChange={event => setLongDescription(event.target.value)}
                        placeholder={t('form.longDescriptionPlaceholder')}
                      />
                      <p className="cai-char-count">{longDescriptionCount}</p>
                    </div>
                  </div>
                </section>

                <section className="cai-form-card cai-form-card--centered">
                  <div className="cai-form-card__header">
                    <p className="cai-form-card__eyebrow">{t('form.sections.avatarTitle')}</p>
                    <p className="cai-form-card__subtitle">{t('form.sections.avatarSubtitle')}</p>
                  </div>
                  <div className="cai-form-card__body">
                    <div className="cai-avatar-row">
                      <div className="cai-avatar-preview">
                        {
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={avatarPreview ?? DEFAULT_CHARACTER_AVATAR}
                            alt={name || 'avatar preview'}
                          />
                        }
                      </div>
                      <div className="cai-avatar-actions">
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

                    <div className="cai-form-section cai-form-section--left">
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
                            className={`cai-category-tag ${
                              categories.includes(option) ? 'active' : ''
                            }`}
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
                  </div>
                </section>

                <section className="cai-form-card">
                  <div className="cai-form-card__header">
                    <p className="cai-form-card__eyebrow">{t('form.sections.visibilityTitle')}</p>
                    <p className="cai-form-card__subtitle">{t('form.sections.visibilitySubtitle')}</p>
                  </div>
                  <div className="cai-form-card__body">
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
                </section>

                <div className="cai-form-actions">
                  <Link href="/dashboard" className="cai-btn cai-btn-ghost">
                    {t('sidebarCancel')}
                  </Link>
                  <button type="submit" className="cai-btn cai-btn-primary" disabled={saving}>
                    {saving ? t('form.submitting') : t('form.submit')}
                  </button>
                </div>
              </form>

              <aside className="cai-create-side-panel">
                <div className="cai-side-card cai-side-card--timeline">
                  <p className="cai-side-card__eyebrow">{t('form.cardEyebrow')}</p>
                  <h4>{t('form.cardTitle')}</h4>
                  <p className="cai-side-card__subtitle">{t('form.cardSubtitle')}</p>
                  <ul className="cai-timeline">
                    {timelineSteps.map((step, index) => (
                      <li key={step.title} className="cai-timeline__item">
                        <span className="cai-timeline__index">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <strong>{step.title}</strong>
                          <p>{step.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {tipCards.map(card => (
                  <div key={card.title} className="cai-side-card">
                    <p className="cai-side-card__title">{card.title}</p>
                    <p className="cai-side-card__description">{card.description}</p>
                  </div>
                ))}
              </aside>
            </section>

            {error ? <p className="cai-form-error">{error}</p> : null}
            {successMessage ? <p className="cai-form-success">{successMessage}</p> : null}
          </main>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
