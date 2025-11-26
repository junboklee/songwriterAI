import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { useRouter } from 'next/router';
import { FormEvent, useMemo, useState } from 'react';

import { AuthLayout } from '@/components/AuthLayout';
import { useTranslation } from '@/context/I18nContext';
import { appleProvider, auth, provider } from '@/lib/firebase';

const mapFirebaseError = (
  error: unknown,
  providerName: 'google' | 'apple' | 'email',
  translate: (key: string) => string
) => {
  if (!(error instanceof FirebaseError)) {
    return translate('errors.default');
  }

  switch (error.code) {
    case 'auth/email-already-in-use':
      return translate('errors.emailInUse');
    case 'auth/weak-password':
      return translate('errors.weakPassword');
    case 'auth/operation-not-allowed':
      return providerName === 'apple'
        ? translate('errors.operationNotAllowedApple')
        : translate('errors.operationNotAllowedGoogle');
    default:
      return error.message || translate('errors.default');
  }
};

export default function Register() {
  const router = useRouter();
  const { t } = useTranslation('auth.register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
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

  const handleEmailRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);

      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }

      pushAfterAuth();
    } catch (err) {
      setError(mapFirebaseError(err, 'email', t));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError(null);
    setIsLoading(true);

    try {
      await signInWithPopup(auth, provider);
      pushAfterAuth();
    } catch (err) {
      setError(mapFirebaseError(err, 'google', t));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleRegister = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const credential = await signInWithPopup(auth, appleProvider);

      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }

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
      heroContent={
        <iframe
          src="https://www.youtube.com/embed/RworMGx4p9k?autoplay=1&mute=1&loop=1&playlist=RworMGx4p9k&controls=1&showinfo=0&modestbranding=1"
          className="auth-hero__video"
          frameBorder="0"
          allow="autoplay; encrypted-media"
          allowFullScreen
        ></iframe>
      }
      navSecondaryAction={{
        label: t('dashboardCta'),
        href: '/dashboard',
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
          onClick={handleGoogleRegister}
          disabled={isLoading}
        >
          <span className="auth-form__icon auth-form__icon--light" style={{ color: '#4285F4' }}>
            G
          </span>
          {isLoading ? t('googleLoading') : t('googleContinue')}
        </button>

        <button
          type="button"
          className="auth-form__button auth-form__button--secondary"
          onClick={handleAppleRegister}
          disabled={isLoading}
        >
          <span className="auth-form__icon" style={{ color: '#fff', background: '#000' }}>
            
          </span>
          {isLoading ? t('appleLoading') : t('appleContinue')}
        </button>

        <div className="auth-form__divider">{t('divider')}</div>

        <form onSubmit={handleEmailRegister} className="auth-form" style={{ gap: 12 }}>
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {t('nicknameLabel')}
            </span>
            <input
              type="text"
              value={displayName}
              onChange={event => setDisplayName(event.target.value)}
              placeholder={t('nicknamePlaceholder')}
              className="auth-form__input"
            />
          </label>

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
              minLength={6}
              autoComplete="new-password"
              className="auth-form__input"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {t('passwordHelp')}
            </span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="auth-form__button auth-form__button--secondary auth-form__button--email"
          >
            {isLoading ? t('emailLoading') : t('emailContinue')}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
