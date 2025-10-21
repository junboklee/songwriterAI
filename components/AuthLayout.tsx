import Link from 'next/link';
import Image from 'next/image';
import { ReactNode } from 'react';

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

export function AuthLayout({
  title,
  subtitle,
  children,
  heroLabel = '열정을 불어넣을 AI와 함께하세요.',
  heroSrc = '/images/auth-hero.jpg',
  heroContent,
  navPrimaryAction,
  navSecondaryAction
}: AuthLayoutProps) {
  return (
    <div className="auth-page">
      <header className="auth-page__nav">
        <div className="auth-page__nav-brand">(character.ai)</div>
        <div className="auth-page__nav-actions">
          {navSecondaryAction ? (
            <Link
              href={navSecondaryAction.href}
              className={`btn ${navSecondaryAction.variant === 'primary' ? 'btn--primary' : 'btn--ghost'}`}
            >
              {navSecondaryAction.label}
            </Link>
          ) : null}
          {navPrimaryAction ? (
            <Link
              href={navPrimaryAction.href}
              className={`btn ${navPrimaryAction.variant === 'primary' ? 'btn--primary' : 'btn--ghost'}`}
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
            계속하면, 약관과 개인정보 보호정책에 동의하는 것입니다.
          </p>
        </section>
        <section className="auth-hero">
          <div className="auth-hero__media">
            {heroContent ? (
              heroContent
            ) : (
              <Image
                src={heroSrc}
                alt="Character AI preview"
                fill
                sizes="(min-width: 1024px) 640px, 80vw"
                priority
              />
            )}
          </div>
          {heroLabel ? <p className="auth-hero__caption">{heroLabel}</p> : null}
        </section>
      </main>

      <footer className="auth-page__footer">
        <nav>
          <Link href="/">정보</Link>
          <Link href="/">채용</Link>
          <Link href="/">보안 센터</Link>
          <Link href="/">블로그</Link>
        </nav>
        <nav>
          <Link href="/">쿠키 정책</Link>
          <Link href="/">개인정보 보호 정책</Link>
          <Link href="/">서비스 약관</Link>
        </nav>
      </footer>
    </div>
  );
}
