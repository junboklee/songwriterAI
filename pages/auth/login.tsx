import { FirebaseError } from 'firebase/app';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { useRouter } from 'next/router';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (!videoRef.current) {
      return;
    }

    videoRef.current.muted = isMuted;

    if (!isMuted && videoRef.current.volume === 0) {
      videoRef.current.volume = 0.5;
    }
  }, [isMuted]);

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
      await signInWithEmailAndPassword(auth, email, password);
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
      await signInWithPopup(auth, provider);
      pushAfterAuth();
    } catch (err) {
      setError(mapFirebaseError(err, 'google', t));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setError('현재 준비중 입니다');
    // setIsLoading(true); // No need to set loading state if we're not proceeding

    // try {
    //   await signInWithPopup(auth, appleProvider);
    //   pushAfterAuth();
    // } catch (err) {
    //   setError(mapFirebaseError(err, 'apple', t));
    // } finally {
    //   setIsLoading(false);
    // }
  };

  const handleToggleAudio = () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (isMuted && video.volume === 0) {
      video.volume = 0.5;
    }

    if (isMuted) {
      void video.play().catch(() => undefined);
    }

    setIsMuted(prev => !prev);
  };

  return (
    <AuthLayout
      title={t('title')}
      subtitle={t('subtitle')}
      heroContent={
        <>
          <video
            ref={videoRef}
            src="/01.mp4"
            className="auth-hero__video"
            autoPlay
            loop
            muted
            playsInline
          />
          <button
            type="button"
            className="auth-hero__audio-toggle"
            aria-pressed={!isMuted}
            aria-label={isMuted ? t('audioOff') : t('audioOn')}
            onClick={handleToggleAudio}
          >
            {isMuted ? t('audioOff') : t('audioOn')}
          </button>
        </>
      }
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
      </div>
    </AuthLayout>
  );
}

