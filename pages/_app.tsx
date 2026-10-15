import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { I18nProvider } from '@/context/I18nContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import SeoMeta from '@/components/SeoMeta';
import SeoDefaults from '@/components/SeoDefaults';
import { installGlobalErrorHandlers } from '@/lib/errorReporting';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    installGlobalErrorHandlers();
  }, []);

  return (
    <I18nProvider>
      <AuthProvider>
        <SeoDefaults />
        <SeoMeta />
        <ErrorBoundary>
          <Component {...pageProps} />
        </ErrorBoundary>
      </AuthProvider>
    </I18nProvider>
  );
}
