import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { I18nProvider } from '@/context/I18nContext';
import SeoMeta from '@/components/SeoMeta';
import SeoDefaults from '@/components/SeoDefaults';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <I18nProvider>
      <AuthProvider>
        <SeoDefaults />
        <SeoMeta />
        <Component {...pageProps} />
      </AuthProvider>
    </I18nProvider>
  );
}
