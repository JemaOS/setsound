// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

export const THEME_STORAGE_KEY = 'setsound-theme';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'system' || value === 'light' || value === 'dark';

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function readStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? getSystemTheme() : mode;
}

export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}
