import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { I18nProvider } from '@/context/I18nContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <I18nProvider>
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </I18nProvider>
  );
}
