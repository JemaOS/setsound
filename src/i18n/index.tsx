// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { translations } from './translations';

export type Lang = 'en' | 'fr';

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // French by default for JemaOS PWAs; the LanguageSelector is a
  // session-only override (never persisted).
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    let text: string = translations[lang][key] ?? translations.en[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) text = text.split(`{${k}}`).join(String(v));
    }
    return text;
  }, [lang]);

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
