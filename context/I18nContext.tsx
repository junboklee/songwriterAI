import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState
} from 'react';

import { defaultLocale, registerTranslations, translate, TranslateOptions } from '@/lib/i18n';
import { ko } from '@/locales/ko';
import { en } from '@/locales/en';

registerTranslations('ko', ko);
registerTranslations('en', en);

type I18nContextValue = {
  locale: string;
  setLocale: (next: string) => void;
  t: (key: string, options?: TranslateOptions) => string;
};

const I18nContext = createContext<I18nContextValue>({
  locale: defaultLocale,
  setLocale: () => undefined,
  t: key => key
});

type I18nProviderProps = {
  children: ReactNode;
  initialLocale?: string;
};

export function I18nProvider({ children, initialLocale = defaultLocale }: I18nProviderProps) {
  const [locale, setLocale] = useState(initialLocale);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key: string, options?: TranslateOptions) => translate(key, options, locale)
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);

export const useTranslation = (namespace?: string) => {
  const { t: baseTranslate, ...rest } = useI18n();

  const scopedTranslate = useCallback(
    (key: string, options?: TranslateOptions) => {
      const resolvedKey = namespace ? `${namespace}.${key}` : key;
      return baseTranslate(resolvedKey, options);
    },
    [baseTranslate, namespace]
  );

  return {
    ...rest,
    t: scopedTranslate
  };
};
