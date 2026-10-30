import { isSupportedLocale, SUPPORTED_LOCALES, type Locale } from '$lib/i18n';

export const LANGUAGE_PREFERENCE_KEY = 'etso:preferred-locale';
export const LANGUAGE_PREFERENCE_EVENT = 'etso:language-preference';
let sessionChoice: Locale | null = null;

export const browserPreferredLocale = (languages: readonly string[]): Locale | null => {
 for (const language of languages) {
  const base = language.trim().toLowerCase().split(/[-_]/)[0];
  if (SUPPORTED_LOCALES.includes(base as Locale)) return base as Locale;
 }
 return null;
};

export const resolvePreferredLocale = (saved: string | null, languages: readonly string[]): Locale | null =>
 saved && isSupportedLocale(saved) ? saved : browserPreferredLocale(languages);

export const readPreferredLocale = (): Locale | null => {
 if (typeof window === 'undefined') return null;
 let saved: string | null = sessionChoice;
 try { saved = window.localStorage.getItem(LANGUAGE_PREFERENCE_KEY); } catch { /* Storage may be unavailable. */ }
 return resolvePreferredLocale(saved, navigator.languages?.length ? navigator.languages : [navigator.language]);
};

export const rememberLocale = (locale: Locale): void => {
 if (typeof window === 'undefined' || !isSupportedLocale(locale)) return;
 sessionChoice = locale;
 try { window.localStorage.setItem(LANGUAGE_PREFERENCE_KEY, locale); } catch { /* The choice still lasts during this client session. */ }
 window.dispatchEvent(new CustomEvent(LANGUAGE_PREFERENCE_EVENT));
};
