import { useState, FormEvent, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FirebaseError } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { AuthLayout } from '@/components/AuthLayout';
import { auth, provider } from '@/lib/firebase';

const mapFirebaseError = (error: unknown) => {
  if (!(error instanceof FirebaseError)) {
    return 'Unexpected error. Please try again.';
  }

  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'This email is already in use. Try signing in instead.';
    case 'auth/weak-password':
      return 'Choose a stronger password (at least 6 characters).';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is disabled for this Firebase project. Enable it in the Firebase Console.';
    default:
      return error.message || 'Registration failed. Try again.';
  }
};

export default function Register() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
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

  const handleEmailRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      if (displayName) {
        await updateProfile(credential.user, { displayName });
      }

      pushAfterAuth();
    } catch (err) {
      setError(mapFirebaseError(err));
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
      subtitle="10초만에 가입하고 대화를 시작하세요."
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
        label: '채팅 살펴보기',
        href: '/dashboard',
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
          onClick={handleGoogleRegister}
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
          onClick={() => alert('Apple 회원가입은 아직 준비 중입니다.')}
          disabled={isLoading}
        >
          <span className="auth-form__icon" style={{ color: '#fff', background: '#000' }}>
            
          </span>
          Apple(으)로 계속
        </button>

        <div className="auth-form__divider">또는</div>

        <form onSubmit={handleEmailRegister} className="auth-form" style={{ gap: 12 }}>
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>닉네임(선택)</span>
            <input
              type="text"
              value={displayName}
              onChange={event => setDisplayName(event.target.value)}
              placeholder="표시할 이름을 입력하세요."
              className="auth-form__input"
            />
          </label>

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
              minLength={6}
              autoComplete="new-password"
              className="auth-form__input"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              최소 6자 이상 입력하세요.
            </span>
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="auth-form__button auth-form__button--secondary auth-form__button--email"
          >
            {isLoading ? '계정 생성 중...' : '이메일로 계속'}
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}

