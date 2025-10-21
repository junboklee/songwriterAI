import { useState, FormEvent, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FirebaseError } from 'firebase/app';
import {
  signInWithPopup,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { AuthLayout } from '@/components/AuthLayout';
import { auth, provider } from '@/lib/firebase';

const mapFirebaseError = (error: unknown) => {
  if (!(error instanceof FirebaseError)) {
    return 'Unexpected error. Please try again.';
  }

  switch (error.code) {
    case 'auth/operation-not-allowed':
      return 'Google sign-in is disabled for this Firebase project. Enable it in the Firebase Console.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Wrong email or password. Check your credentials and try again.';
    case 'auth/invalid-credential':
      return 'The credential is invalid or expired. Retry the login.';
    default:
      return error.message || 'Authentication failed. Try again.';
  }
};

export default function Login() {
  const router = useRouter();
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
      setError(mapFirebaseError(err));
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
      setError(mapFirebaseError(err));
    } finally {
      setIsLoading(false);
    }
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
      video.play().catch(() => undefined);
    }

    setIsMuted(prev => !prev);
  };

  return (
    <AuthLayout
      title="YEON:VERSE" 
      subtitle="안녕하세요. 가수 다연입니다."
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
            aria-label={isMuted ? '음성 켜기' : '음성 끄기'}
            onClick={handleToggleAudio}
          >
            {isMuted ? '음성 켜기' : '음성 끄기'}
          </button>
        </>
      }
      navSecondaryAction={{
        label: '채팅에 가입하기',
        href: '/auth/register',
        variant: 'primary'
      }}
      navPrimaryAction={{
        label: '로그인',
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
          {isLoading ? 'Google 연결 중...' : 'Google(으)로 계속'}
        </button>

        <button
          type="button"
          className="auth-form__button auth-form__button--secondary"
          onClick={() => alert('Apple 로그인은 아직 준비 중입니다.')}
          disabled={isLoading}
        >
          <span className="auth-form__icon" style={{ color: '#fff', background: '#000' }}>
            
          </span>
          Apple(으)로 계속
        </button>

        <div className="auth-form__divider">또는</div>

        <form onSubmit={handleEmailLogin} className="auth-form" style={{ gap: 12 }}>
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>이메일</span>
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
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>비밀번호</span>
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
            {isLoading ? '로그인 중…' : '이메일로 계속'}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
