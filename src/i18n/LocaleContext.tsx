'use client';

import { createContext, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { translations, type Locale, type TranslationShape } from './translations';

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationShape;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = 'next5-locale';

const readStoredLocale = (): Locale => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'vi' ? 'vi' : 'en';
  } catch {
    return 'en';
  }
};

// A minimal external store over localStorage — useSyncExternalStore handles
// the server/client mismatch correctly (server and the first client paint
// both render 'en'; the real stored value takes over right after), which a
// useEffect + setState round-trip can't do without an extra render.
let listeners: (() => void)[] = [];
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
};
const getServerSnapshot = (): Locale => 'en';

const writeLocale = (next: Locale) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Private browsing / storage blocked — locale just won't persist.
  }
  notify();
};

/** Client-side language toggle — not routed (no /en, /vi paths), so it works
 *  regardless of this project's unusual Next.js version. Persisted per
 *  browser via localStorage. */
export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const locale = useSyncExternalStore(subscribe, readStoredLocale, getServerSnapshot);

  return (
    <LocaleContext.Provider value={{ locale, setLocale: writeLocale, t: translations[locale] }}>
      {children}
    </LocaleContext.Provider>
  );
};

/** Returns the active locale, a setter, and `t` — the current locale's full
 *  translation object (e.g. `t.hero.subhead`), not a lookup function. */
export const useLocale = (): LocaleContextValue => {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used within a LocaleProvider');
  return context;
};
