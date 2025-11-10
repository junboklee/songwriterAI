import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';

type RequireAuthProps = {
  children: ReactNode;
};

export function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useTranslation('common');

  useEffect(() => {
    if (loading || user) {
      return;
    }

    const redirect = encodeURIComponent(router.asPath || '/dashboard');
    router.replace(`/auth/login?redirect=${redirect}`);
  }, [loading, router, user]);

  if (loading || (!user && typeof window !== 'undefined')) {
    return (
      <div className="auth-loading">
        <div className="auth-loading__spinner" />
        <p>{t('loadingSession')}</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
