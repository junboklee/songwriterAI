import { FirebaseError } from 'firebase/app';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { AuthLayout } from '@/components/AuthLayout';
import { AuthNotice } from '@/components/AuthNotice';
import { useTranslation } from '@/context/I18nContext';
import { appleProvider, appleSignInEnabled, auth, provider } from '@/lib/firebase';
import { trackAuth } from '@/lib/analyticsAuth';

const mapFirebaseError = (
  error: unknown,
  providerName: 'google' | 'apple' | 'email',
  translate: (key: string) => string
) => {
  if (!(error instanceof FirebaseError)) {
    return translate('errors.default');
  }

  switch (error.code) {
    case 'auth/operation-not-allowed':
      return providerName === 'apple'
        ? translate('errors.operationNotAllowedApple')
        : translate('errors.operationNotAllowedGoogle');
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return translate('errors.userNotFound');
    case 'auth/invalid-credential':
      return translate('errors.invalidCredential');
    default:
      return error.message || translate('errors.default');
  }
};

export default function Login() {
  const router = useRouter();
  const { t } = useTranslation('auth.login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTarget = useMemo(() => {
    if (typeof router.query.redirect === 'string') {
      try {
        const decoded = decodeURIComponent(router.query.redirect);
        return decoded.startsWith('/') ? decoded : '/dashboard';
      } catch {
        return '/dashboard';
      }
    }
    return '/dashboard';
  }, [router.query.redirect]);

  const pushAfterAuth = () => {
    router.push(redirectTarget);
  };

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      trackAuth(await signInWithEmailAndPassword(auth, email, password), 'email', 'login');
      pushAfterAuth();
    } catch (err) {
      setError(mapFirebaseError(err, 'email', t));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      trackAuth(await signInWithPopup(auth, provider), 'google', 'login');
      pushAfterAuth();
    } catch (err) {
      setError(mapFirebaseError(err, 'google', t));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      trackAuth(await signInWithPopup(auth, appleProvider), 'apple', 'login');
      pushAfterAuth();
    } catch (err) {
      setError(mapFirebaseError(err, 'apple', t));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('title')}
      subtitle={t('subtitle')}
      navSecondaryAction={{
        label: t('registerCta'),
        href: '/auth/register',
        variant: 'primary'
      }}
      navPrimaryAction={{
        label: t('loginCta'),
        href: '/auth/login',
        variant: 'ghost'
      }}
    >
      <div className="auth-form">
        {error ? <div className="auth-form__error">{error}</div> : null}

        <button
          type="button"
          className="auth-form__button auth-form__button--primary"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <span className="auth-form__icon auth-form__icon--light" style={{ color: '#4285F4' }}>
            G
          </span>
          {isLoading ? t('googleLoading') : t('googleContinue')}
        </button>

        {appleSignInEnabled ? (
          <button
            type="button"
            className="auth-form__button auth-form__button--secondary"
            onClick={handleAppleLogin}
            disabled={isLoading}
          >
            <span className="auth-form__icon" style={{ color: '#fff', background: '#000' }}>
              
            </span>
            {isLoading ? t('appleLoading') : t('appleContinue')}
          </button>
        ) : null}

        <div className="auth-form__divider">{t('divider')}</div>

        <form onSubmit={handleEmailLogin} className="auth-form" style={{ gap: 12 }}>
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {t('emailLabel')}
            </span>
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
              autoComplete="email"
              className="auth-form__input"
            />
          </label>

          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {t('passwordLabel')}
            </span>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              className="auth-form__input"
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="auth-form__button auth-form__button--secondary auth-form__button--email"
          >
            {isLoading ? t('emailLoading') : t('emailContinue')}
          </button>
        </form>

        <AuthNotice />
      </div>
    </AuthLayout>
  );
}

