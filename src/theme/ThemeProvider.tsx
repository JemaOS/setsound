// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  THEME_STORAGE_KEY,
  applyTheme,
  getSystemTheme,
  isThemeMode,
  readStoredTheme,
  type ResolvedTheme,
  type ThemeMode,
} from './theme';
import { ThemeContext } from './ThemeContext';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredTheme());
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => getSystemTheme());

  const resolvedTheme: ResolvedTheme = mode === 'system' ? systemTheme : mode;

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      setModeState(isThemeMode(event.newValue) ? event.newValue : 'system');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage may be unavailable (private mode); the in-memory choice still applies.
    }
  }, []);

  const value = useMemo(
    () => ({ mode, resolvedTheme, setMode }),
    [mode, resolvedTheme, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
