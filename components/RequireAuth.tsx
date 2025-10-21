import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || user) {
      return;
    }

    const redirect = encodeURIComponent(router.asPath || '/dashboard');
    router.replace(`/auth/login?redirect=${redirect}`);
  }, [user, loading, router]);

  if (loading || (!user && typeof window !== 'undefined')) {
    return (
      <div className="auth-loading">
        <div className="auth-loading__spinner" />
        <p>Checking your session…</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
