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
    background: '#ffffff',
    surface: '#eef2f7',
    surfaceCard: '#ffffff',
    surfaceMuted: '#e2e8f0',
    surfaceDark: '#0b1120',
    surfaceCardDark: '#141c2e',
    surfaceElevatedDark: '#1c2740',

    // Text colors
    text: '#0f172a', // dark slate
    textSecondary: '#64748b', // slate
    textMuted: '#94a3b8', // light slate

    // Border
    border: '#e2e8f0',
    borderDark: '#2d3a52',
  },
  dark: {
    // Primary colors from dashboard (adjusted for dark mode)
    primary: '#0d9488', // teal (keep same)
    secondary: '#0284c7', // blue (keep same)
    accent: '#14b8a6', // teal lighter (keep same)

    // Surface colors (dark mode)
    background: '#0f172a', // very dark blue
    surface: '#1e293b', // dark blue
    surfaceCard: '#1e293b',
    surfaceMuted: '#334155',
    surfaceDark: '#0f172a',
    surfaceCardDark: '#0f172a',
    surfaceElevatedDark: '#1e293b',

    // Text colors (dark mode)
    text: '#f8fafc', // almost white
    textSecondary: '#cbd5e1', // light slate
    textMuted: '#94a3b8', // slate

    // Border (dark mode)
    border: '#334155',
    borderDark: '#475569',
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
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
