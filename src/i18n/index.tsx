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

const LANG_STORAGE_KEY = 'jemaos_lang';

// Langue initiale : choix persisté de l'utilisateur, sinon langue du
// navigateur/système (en ou fr), sinon anglais. Les PWA suivent donc la
// langue du système/navigateur par défaut.
function detectInitialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'en' || saved === 'fr') return saved;
  } catch {
    /* stockage indisponible */
  }
  try {
    const candidates = navigator.languages?.length
      ? navigator.languages
      : [navigator.language];
    for (const candidate of candidates) {
      const short = (candidate || '').toLowerCase().split('-')[0];
      if (short === 'en' || short === 'fr') return short;
    }
  } catch {
    /* navigator indisponible */
  }
  return 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, l);
    } catch {
      /* stockage indisponible */
    }
  }, []);

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
