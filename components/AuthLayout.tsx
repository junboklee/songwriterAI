import Image from 'next/image';
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
  heroSrc?: string;
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
  heroSrc = '/images/auth-hero.jpg',
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
              <Image
                src={heroSrc}
                alt="Character AI preview"
                fill
                sizes="(min-width: 1024px) 640px, 80vw"
                priority
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
