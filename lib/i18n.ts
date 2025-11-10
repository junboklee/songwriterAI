type TranslationRecord = Record<string, unknown>;

const flatten = (obj: TranslationRecord, prefix = ''): Record<string, string> => {
  return Object.entries(obj).reduce<Record<string, string>>((acc, [key, value]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(acc, flatten(value as TranslationRecord, nextKey));
    } else if (typeof value === 'string') {
      acc[nextKey] = value;
    }

    return acc;
  }, {});
};

export const defaultLocale = 'ko';

type TranslationStore = Record<string, Record<string, string>>;

const store: TranslationStore = {};

export const registerTranslations = (locale: string, data: TranslationRecord) => {
  store[locale] = flatten(data);
};

export type TranslateOptions = {
  replacements?: Record<string, string | number>;
};

export const translate = (key: string, options?: TranslateOptions, locale = defaultLocale) => {
  const dictionary = store[locale];
  if (!dictionary) {
    return key;
  }

  const template = dictionary[key];
  if (!template) {
    return key;
  }

  if (!options?.replacements) {
    return template;
  }

  return Object.entries(options.replacements).reduce((acc, [placeholder, value]) => {
    const pattern = new RegExp(`{{\\s*${placeholder}\\s*}}`, 'g');
    return acc.replace(pattern, String(value));
  }, template);
};

