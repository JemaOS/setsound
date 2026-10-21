// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/i18n';
import { useTheme } from './ThemeContext';
import type { ThemeMode } from './theme';

const MonitorIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
  </svg>
);

const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const THEME_OPTIONS: Array<{ id: ThemeMode; labelKey: string; icon: () => JSX.Element }> = [
  { id: 'system', labelKey: 'themeSystem', icon: MonitorIcon },
  { id: 'light', labelKey: 'themeLight', icon: SunIcon },
  { id: 'dark', labelKey: 'themeDark', icon: MoonIcon },
];

export const ThemeSwitcher = ({ className = '' }: { className?: string }) => {
  const { mode, setMode } = useTheme();
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const currentIndex = Math.max(0, THEME_OPTIONS.findIndex((option) => option.id === mode));
  const currentOption = THEME_OPTIONS[currentIndex];
  const CurrentIcon = currentOption.icon;
  const currentLabel = t(currentOption.labelKey);

  const close = (restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;
    const frame = window.requestAnimationFrame(() => {
      itemRefs.current[currentIndex]?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, currentIndex]);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const focusItem = (index: number) => {
    const count = THEME_OPTIONS.length;
    const next = (index + count) % count;
    itemRefs.current[next]?.focus();
  };

  const handleItemKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusItem(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusItem(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusItem(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusItem(THEME_OPTIONS.length - 1);
    } else if (event.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const handleSelect = (next: ThemeMode) => {
    setMode(next);
    close(true);
  };

  return (
    <div ref={containerRef} className={`theme-selector relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
        className={`h-10 w-10 sm:h-9 sm:w-9 md:h-8 md:w-8 rounded-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
          isOpen
            ? 'bg-neutral-700/70 text-neutral-100'
            : 'bg-neutral-800/50 hover:bg-neutral-700/70 text-neutral-300'
        }`}
        aria-label={`${t('theme')} (${currentLabel})`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title={`${t('theme')}: ${currentLabel}`}
      >
        <CurrentIcon />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label={t('theme')}
          className="absolute left-0 top-full mt-2 min-w-[150px] bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl py-1 z-50"
        >
          {THEME_OPTIONS.map((option, index) => {
            const OptionIcon = option.icon;
            const isSelected = mode === option.id;
            return (
              <button
                key={option.id}
                ref={(element) => {
                  itemRefs.current[index] = element;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                tabIndex={-1}
                onClick={() => handleSelect(option.id)}
                onKeyDown={(event) => handleItemKeyDown(event, index)}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? 'bg-neutral-800 text-neutral-100 font-medium'
                    : 'text-neutral-300 hover:bg-neutral-700 hover:text-neutral-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <OptionIcon />
                  <span>{t(option.labelKey)}</span>
                </span>
                {isSelected && <span className="text-primary-500"><CheckIcon /></span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ThemeSwitcher;
