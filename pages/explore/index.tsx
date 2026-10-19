import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { AppNav } from '@/components/AppNav';
import { AppShell } from '@/components/AppShell';
import { MainSidebar } from '@/components/MainSidebar';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';
import { DEFAULT_CHARACTER_AVATAR } from '@/lib/constants';
import type { PublicCharacter } from '@/lib/exploreQuery';
import { trackEvent } from '@/lib/analytics';

type ExploreCharacter = PublicCharacter & { likedByMe: boolean };

const PAGE_SIZE = 12;
const REPORT_REASONS = ['inappropriate', 'copyright', 'spam', 'other'] as const;

export default function ExplorePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('explore');
  const sidebar = useMemo(() => <MainSidebar active="explore" />, []);

  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<'recent' | 'popular'>('popular');
  const [characters, setCharacters] = useState<ExploreCharacter[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<ExploreCharacter | null>(null);

  const authHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (!user) {
      return {};
    }
    try {
      return { Authorization: `Bearer ${await user.getIdToken()}` };
    } catch {
      return {};
    }
  }, [user]);

  const fetchPage = useCallback(
    async (cursor: number | null) => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), sort });
      if (query) params.set('q', query);
      if (category) params.set('category', category);
      if (cursor) params.set('cursor', String(cursor));

      const response = await fetch(`/api/characters/explore?${params.toString()}`, {
        headers: await authHeaders()
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload) {
        throw new Error(t('error'));
      }
      return payload as {
        characters: ExploreCharacter[];
        nextCursor: number | null;
        categories: string[];
      };
    },
    [authHeaders, category, query, sort, t]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPage(null)
      .then(payload => {
        if (cancelled) return;
        setCharacters(payload.characters);
        setNextCursor(payload.nextCursor);
        setCategories(payload.categories);
      })
      .catch(fetchError => {
        if (!cancelled) setError(fetchError instanceof Error ? fetchError.message : t('error'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage, t]);

  const handleLoadMore = async () => {
    if (nextCursor === null || loading) return;
    setLoading(true);
    try {
      const payload = await fetchPage(nextCursor);
      setCharacters(prev => [...prev, ...payload.characters]);
      setNextCursor(payload.nextCursor);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setQuery(searchInput.trim());
  };

  const handleToggleLike = async (character: ExploreCharacter) => {
    if (!user) {
      setNotice(t('loginToLike'));
      return;
    }
    const liking = !character.likedByMe;
    const apply = (liked: boolean, likeCount: number) =>
      setCharacters(prev =>
        prev.map(item => (item.id === character.id ? { ...item, likedByMe: liked, likeCount } : item))
      );

    apply(liking, Math.max(0, character.likeCount + (liking ? 1 : -1)));
    try {
      const response = await fetch(`/api/characters/${encodeURIComponent(character.id)}/like`, {
        method: liking ? 'POST' : 'DELETE',
        headers: await authHeaders()
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error();
      apply(payload.liked, payload.likeCount);
      if (payload.liked) {
        trackEvent('character_liked');
      }
    } catch {
      apply(character.likedByMe, character.likeCount);
      setNotice(t('error'));
    }
  };

  return (
    <>
      <Head>
        <title key="title">{`${t('title')} | NovaSingerAI`}</title>
        <meta key="description" name="description" content={t('subtitle')} />
      </Head>
      <AppShell sidebar={sidebar}>
        <div className="page-actions-bar">
          <AppNav showBrand={false} />
        </div>

        <div className="explore-page">
          <header className="explore-page__header">
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </header>

          <div className="explore-page__controls">
            <form onSubmit={handleSearch} className="explore-page__search">
              <input
                className="search-input"
                type="search"
                value={searchInput}
                placeholder={t('searchPlaceholder')}
                onChange={event => {
                  setSearchInput(event.target.value);
                  if (!event.target.value) setQuery('');
                }}
              />
            </form>
            <select
              className="dashboard-section__select"
              value={category}
              onChange={event => setCategory(event.target.value)}
              aria-label={t('allCategories')}
            >
              <option value="">{t('allCategories')}</option>
              {categories.map(item => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              className="dashboard-section__select"
              value={sort}
              onChange={event => setSort(event.target.value === 'recent' ? 'recent' : 'popular')}
            >
              <option value="popular">{t('sortPopular')}</option>
              <option value="recent">{t('sortRecent')}</option>
            </select>
          </div>

          {notice ? (
            <p className="explore-page__notice" role="status" onClick={() => setNotice(null)}>
              {notice}
            </p>
          ) : null}
          {error ? <p className="explore-page__notice explore-page__notice--error">{error}</p> : null}
          {!loading && !error && characters.length === 0 ? (
            <p className="explore-page__notice">{t('empty')}</p>
          ) : null}

          <div className="dashboard-grid">
            {characters.map(character => (
              <article key={character.id} className="dashboard-card explore-card">
                <Image
                  src={character.avatarUrl || DEFAULT_CHARACTER_AVATAR}
                  alt=""
                  width={60}
                  height={60}
                  style={{ borderRadius: '50%', objectFit: 'cover' }}
                />
                <h3 className="dashboard-card__title">{character.name}</h3>
                {character.shortDescription ? (
                  <p className="dashboard-card__meta">{character.shortDescription}</p>
                ) : null}
                {character.categories.length ? (
                  <div className="explore-card__tags">
                    {character.categories.slice(0, 4).map(item => (
                      <button key={item} type="button" onClick={() => setCategory(item)}>
                        #{item}
                      </button>
                    ))}
                  </div>
                ) : null}
                <p className="explore-card__stats">
                  <span>♥ {character.likeCount}</span>
                  <span>{t('chats', { replacements: { count: character.useCount } })}</span>
                </p>
                <div className="dashboard-card__actions explore-card__actions">
                  <button
                    type="button"
                    className="dashboard-card__button dashboard-card__button--primary"
                    onClick={() => void router.push({ pathname: '/chat', query: { characterId: character.id } })}
                  >
                    {t('startChat')}
                  </button>
                  <button
                    type="button"
                    className={`dashboard-card__button explore-card__like${character.likedByMe ? ' is-liked' : ''}`}
                    aria-pressed={character.likedByMe}
                    onClick={() => void handleToggleLike(character)}
                  >
                    {character.likedByMe ? `♥ ${t('unlike')}` : `♡ ${t('like')}`}
                  </button>
                  {user ? (
                    <button
                      type="button"
                      className="explore-card__report"
                      onClick={() => setReportTarget(character)}
                    >
                      {t('report')}
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          {loading ? <p className="explore-page__notice">{t('loading')}</p> : null}
          {nextCursor !== null && !loading ? (
            <div className="suno-page__load-more">
              <button type="button" className="btn btn--ghost" onClick={() => void handleLoadMore()}>
                {t('loadMore')}
              </button>
            </div>
          ) : null}

          {!user ? (
            <p className="explore-page__notice">
              <Link href="/auth/login">{t('loginToLike')}</Link>
            </p>
          ) : null}
        </div>

        {reportTarget ? (
          <ReportDialog
            character={reportTarget}
            getHeaders={authHeaders}
            onClose={message => {
              setReportTarget(null);
              if (message) setNotice(message);
            }}
          />
        ) : null}
      </AppShell>
    </>
  );
}

function ReportDialog({
  character,
  getHeaders,
  onClose
}: {
  character: ExploreCharacter;
  getHeaders: () => Promise<Record<string, string>>;
  onClose: (message?: string) => void;
}) {
  const { t } = useTranslation('explore');
  const [reason, setReason] = useState<(typeof REPORT_REASONS)[number]>('inappropriate');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/characters/${encodeURIComponent(character.id)}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await getHeaders()) },
        body: JSON.stringify({ reason, detail })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(typeof payload?.error === 'string' ? payload.error : t('reportError'));
      }
      trackEvent('character_reported', { reason });
      onClose(t('reportDone'));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('reportError'));
      setSubmitting(false);
    }
  };

  return (
    <div className="share-modal" role="dialog" aria-modal="true" aria-label={t('reportTitle')}>
      <div className="share-modal__backdrop" onClick={() => onClose()} />
      <form className="share-modal__content explore-report" onSubmit={handleSubmit}>
        <header className="share-modal__header">
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>
            {t('reportTitle')} · {character.name}
          </h2>
        </header>
        <div className="explore-report__body">
          <fieldset>
            <legend>{t('reportReason')}</legend>
            {REPORT_REASONS.map(item => (
              <label key={item}>
                <input
                  type="radio"
                  name="reason"
                  value={item}
                  checked={reason === item}
                  onChange={() => setReason(item)}
                />
                {t(`reasons.${item}`)}
              </label>
            ))}
          </fieldset>
          <label className="song-editor__field">
            <span>{t('reportDetail')}</span>
            <textarea
              className="suno-form__textarea"
              rows={3}
              maxLength={500}
              value={detail}
              onChange={event => setDetail(event.target.value)}
            />
          </label>
          {error ? <p className="explore-page__notice explore-page__notice--error">{error}</p> : null}
        </div>
        <footer className="share-modal__footer">
          <button type="button" className="btn btn--ghost" onClick={() => onClose()}>
            {t('reportCancel')}
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {t('reportSubmit')}
          </button>
        </footer>
      </form>
    </div>
  );
}
