// Copyright (c) 2025 Jema Technology.
// Distributed under the license specified in the root directory of this project.

import { createContext, useContext } from 'react';
import type { ResolvedTheme, ThemeMode } from './theme';

export interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
