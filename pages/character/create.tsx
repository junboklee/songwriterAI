import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/router';

import { AppNav } from '@/components/AppNav';
import { AppShell } from '@/components/AppShell';
import { MainSidebar } from '@/components/MainSidebar';
import { RequireAuth } from '@/components/RequireAuth';
import { CategoryPicker } from '@/components/character/CategoryPicker';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';
import { useAvatarPicker } from '@/hooks/useAvatarPicker';
import { authedJson, errorMessage } from '@/lib/authedFetch';
import { CHARACTER_LIMITS, findCharacterLimitError } from '@/lib/characterFields';
import { trackEvent } from '@/lib/analytics';

type VisibilityOption = 'private' | 'unlisted' | 'public';
type GenderOption = 'male' | 'female' | 'none';

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
  const [visibility, setVisibility] = useState<VisibilityOption>('private');
  const [gender, setGender] = useState<GenderOption>('none');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const avatar = useAvatarPicker(null, {
    invalidType: t('errors.avatarType'),
    tooLarge: t('errors.avatarSize')
  });

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

    const limitError = findCharacterLimitError(
      { name: name.trim(), greeting: greeting.trim(), shortDescription: shortDescription.trim(), longDescription: longDescription.trim() },
      categories
    );
    if (limitError) {
      setError(limitError);
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('greeting', greeting);
      formData.append('shortDescription', shortDescription);
      formData.append('longDescription', longDescription);
      formData.append('visibility', visibility);
      formData.append('categories', JSON.stringify(categories));
      formData.append('gender', gender);

      if (avatar.file) {
        formData.append('avatar', avatar.file);
      }

      await authedJson(user, '/api/characters', t('error'), { method: 'POST', body: formData });

      trackEvent('character_created', { visibility });
      setSuccessMessage(t('saveSuccess'));
      void router.push('/dashboard');
    } catch (err) {
      setError(errorMessage(err, t('error')));
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
                          maxLength={CHARACTER_LIMITS.name}
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
                          maxLength={CHARACTER_LIMITS.greeting}
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
                          maxLength={CHARACTER_LIMITS.shortDescription}
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
                        maxLength={CHARACTER_LIMITS.longDescription}
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
                            src={avatar.preview}
                            alt={name || 'avatar preview'}
                          />
                        }
                      </div>
                      <div className="cai-avatar-actions">
                        <input
                          ref={avatar.inputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          style={{ display: 'none' }}
                          onChange={avatar.onChange}
                          disabled={saving}
                        />
                        <button
                          type="button"
                          className="cai-btn cai-btn-primary"
                          onClick={avatar.open}
                          disabled={saving}
                        >
                          {t('form.avatarUpload')}
                        </button>
                        <button
                          type="button"
                          className="cai-btn cai-btn-ghost"
                          onClick={avatar.reset}
                          disabled={saving}
                        >
                          {t('form.avatarReset')}
                        </button>
                      </div>
                    </div>
                    {avatar.error ? <p className="cai-form-error">{avatar.error}</p> : null}

                    <CategoryPicker
                      inputId="categories"
                      label={t('form.categories')}
                      placeholder={t('form.categoryPlaceholder')}
                      removeLabel={t('form.categoryRemove')}
                      value={categories}
                      onChange={setCategories}
                      disabled={saving}
                    />
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

                {error ? (
                  <p className="cai-form-error" role="alert">
                    {error}
                  </p>
                ) : null}
                {successMessage ? (
                  <p className="cai-form-success" role="status">
                    {successMessage}
                  </p>
                ) : null}
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

          </main>
        </div>
      </AppShell>
    </RequireAuth>
  );
}
