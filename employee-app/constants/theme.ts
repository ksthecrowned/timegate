/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * Based on dashboard design system with teal primary color.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Primary colors from dashboard
    primary: '#0d9488', // teal
    secondary: '#0284c7', // blue
    accent: '#14b8a6', // teal lighter

    // Surface colors
    background: '#f8fafc',
    surface: '#eef2f7',
    surfaceCard: '#ffffff',
    surfaceMuted: '#e2e8f0',
    surfaceDark: '#0b1120',
    surfaceCardDark: '#141c2e',
    surfaceElevatedDark: '#1c2740',

    // Text colors
    text: '#0f172a', // dark slate
    textSecondary: '#475569', // stronger for AA on white
    textMuted: '#64748b',

    // Border
    border: '#e2e8f0',
    borderDark: '#2d3a52',

    // Semantic
    success: '#059669',
    successSoft: 'rgba(5, 150, 105, 0.12)',
    warning: '#d97706',
    warningSoft: 'rgba(217, 119, 6, 0.12)',
    danger: '#dc2626',
    dangerSoft: 'rgba(220, 38, 38, 0.12)',
    info: '#0284c7',
    infoSoft: 'rgba(2, 132, 199, 0.12)',
  },
  dark: {
    primary: '#2dd4bf',
    secondary: '#38bdf8',
    accent: '#5eead4',

    background: '#0f172a',
    surface: '#1e293b',
    surfaceCard: '#1e293b',
    surfaceMuted: '#334155',
    surfaceDark: '#0f172a',
    surfaceCardDark: '#0f172a',
    surfaceElevatedDark: '#1e293b',

    text: '#f8fafc',
    textSecondary: '#cbd5e1',
    textMuted: '#94a3b8',

    border: '#334155',
    borderDark: '#475569',

    success: '#34d399',
    successSoft: 'rgba(52, 211, 153, 0.15)',
    warning: '#fbbf24',
    warningSoft: 'rgba(251, 191, 36, 0.15)',
    danger: '#f87171',
    dangerSoft: 'rgba(248, 113, 113, 0.15)',
    info: '#38bdf8',
    infoSoft: 'rgba(56, 189, 248, 0.15)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * Aliases that map legacy / convenience keys to canonical Colors fields.
 * `useTheme` merges these into the returned object so existing screens
 * can use `theme.tint` / `theme.backgroundElement` without breaking.
 */
export const ThemeAliases = {
  tint: 'primary',
  bg: 'background',
  backgroundElement: 'surfaceCard',
  backgroundElementDark: 'surfaceCardDark',
  backgroundSelected: 'surfaceMuted',
  backgroundSelectedDark: 'surfaceElevatedDark',
} as const;

export const Fonts = {
  // Use Comfortaa font from Google Fonts
  // Will be loaded via useFont hook from @expo-google-fonts/comfortaa
  ios: {
    regular: 'Comfortaa_400Regular',
    medium: 'Comfortaa_500Medium',
    bold: 'Comfortaa_700Bold',
  },
  android: {
    regular: 'Comfortaa_400Regular',
    medium: 'Comfortaa_500Medium',
    bold: 'Comfortaa_700Bold',
  },
  web: {
    regular: 'Comfortaa',
    medium: 'Comfortaa',
    bold: 'Comfortaa',
  },
};

export const Spacing = {
  px: 1,
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,
  /** Semantic aliases (Tailwind-like). */
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  /** Legacy Expo template aliases */
  half: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 20,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

/** Touch target minimum (WCAG / Apple HIG). */
export const MinTouchTarget = 44;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;
