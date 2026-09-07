// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { useEffect, useState } from 'react';
import { LANGUAGES } from '@/i18n/translations';
import { useI18n, Lang } from '@/i18n';

interface LanguageSelectorProps {
  className?: string;
}

export const LanguageSelector = ({ className = '' }: LanguageSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { lang, setLang, t } = useI18n();

  const handleSelect = (langCode: Lang) => {
    setLang(langCode);
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest('.language-selector')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  const currentLangData = LANGUAGES[lang] || LANGUAGES.en;

  return (
    <div className={`language-selector relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`h-10 w-10 sm:h-9 sm:w-9 md:h-8 md:w-8 rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
          isOpen
            ? 'bg-neutral-700/70 text-neutral-100'
            : 'bg-neutral-800/50 hover:bg-neutral-700/70 text-neutral-300'
        }`}
        aria-label={t('language')}
        title={t('language')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-4 sm:h-4">
          <path d="M5 8l6 6M4 14h8M5.5 14l2-6h1l2 6" />
          <path d="M14 5h6M17 5v9M14 9h6" />
        </svg>
        <span className="text-xs font-semibold tracking-wide">{currentLangData.code.toUpperCase()}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 min-w-[130px] bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl py-1 z-50">
          {Object.values(LANGUAGES).map((language) => (
            <button
              key={language.code}
              onClick={(e) => {
                e.stopPropagation();
                handleSelect(language.code as Lang);
              }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors ${
                lang === language.code
                  ? 'bg-primary-500/20 text-primary-400 font-medium'
                  : 'text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100'
              }`}
            >
              <span>{language.name}</span>
              <span className="text-xs opacity-70">{language.code.toUpperCase()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
