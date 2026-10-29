import Link from 'next/link';
import type { ReactNode } from 'react';

import { useTranslation } from '@/context/I18nContext';

type NavAction = {
  label: string;
  href: string;
  variant?: 'primary' | 'ghost';
};

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  heroLabel?: string;
  heroContent?: ReactNode;
  navPrimaryAction?: NavAction;
  navSecondaryAction?: NavAction;
};

const FOOTER_LINKS: Array<{ labelKey: string; href: string }> = [
  { labelKey: 'home', href: '/' },
  { labelKey: 'pricing', href: '/pricing' },
  { labelKey: 'privacy', href: '/privacy' },
  { labelKey: 'terms', href: '/terms' }
];

export function AuthLayout({
  title,
  subtitle,
  children,
  heroLabel,
  heroContent,
  navPrimaryAction,
  navSecondaryAction
}: AuthLayoutProps) {
  const { t } = useTranslation('authLayout');
  const { t: tCommon } = useTranslation('common');

  const resolvedHeroLabel = heroLabel ?? t('defaultHeroLabel');
  const firstFooter = FOOTER_LINKS.slice(0, 2);
  const secondFooter = FOOTER_LINKS.slice(2);

  return (
    <div className="auth-page">
      <header className="auth-page__nav">
        <div className="auth-page__nav-brand">{tCommon('brand')}</div>
        <div className="auth-page__nav-actions">
          {navSecondaryAction ? (
            <Link
              href={navSecondaryAction.href}
              className={`btn ${
                navSecondaryAction.variant === 'primary' ? 'btn--primary' : 'btn--ghost'
              }`}
            >
              {navSecondaryAction.label}
            </Link>
          ) : null}
          {navPrimaryAction ? (
            <Link
              href={navPrimaryAction.href}
              className={`btn ${
                navPrimaryAction.variant === 'primary' ? 'btn--primary' : 'btn--ghost'
              }`}
            >
              {navPrimaryAction.label}
            </Link>
          ) : null}
        </div>
      </header>

      <main className="auth-page__body">
        <section className="auth-card glass-panel">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
          {children}
          <p className="auth-card__terms">
            {t('termsPrefix')}
            <Link href="/terms">{t('footer.terms')}</Link>
            {t('termsAnd')}
            <Link href="/privacy">{t('footer.privacy')}</Link>
            {t('termsSuffix')}
          </p>
        </section>
        <section className="auth-hero">
          <div className="auth-hero__media">
            {heroContent ?? (
              // Plain <img> with pre-sized WebP files: App Hosting does not serve /_next/image.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/images/auth-hero-1024.webp"
                srcSet="/images/auth-hero-640.webp 640w, /images/auth-hero-1024.webp 1024w, /images/auth-hero-1456.webp 1456w"
                sizes="(min-width: 1024px) 640px, 90vw"
                alt=""
                className="auth-hero__image"
              />
            )}
          </div>
          {resolvedHeroLabel ? <p className="auth-hero__caption">{resolvedHeroLabel}</p> : null}
        </section>
      </main>

      <footer className="auth-page__footer">
        <nav>
          {firstFooter.map(item => (
            <Link key={item.labelKey} href={item.href}>
              {t(`footer.${item.labelKey}`)}
            </Link>
          ))}
        </nav>
        <nav>
          {secondFooter.map(item => (
            <Link key={item.labelKey} href={item.href}>
              {t(`footer.${item.labelKey}`)}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  );
}
