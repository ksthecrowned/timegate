/**
 * Palette alignée sur le dashboard et l'employee-app.
 * Teal `#0d9488` en primary, slate dark mode pour les fonds.
 * C'est la seule source de vérité pour les couleurs du kiosque.
 */

import { Platform } from "react-native";

export type ColorScheme = "light" | "dark";

export const palette = {
  // Primary
  teal: "#0d9488",
  tealDark: "#0f766e",
  tealLight: "#14b8a6",
  blue: "#0284c7",
  blueDark: "#0369a1",

  // Surfaces (dark mode — kiosque est toujours sombre pour cohérence hardware)
  bgDeep: "#020617", // fond derrière la caméra
  bg: "#0f172a", // surface principale
  surface: "#1e293b", // cards / inputs
  surfaceMuted: "#334155", // hover / selected
  surfaceElevated: "#1c2740", // card élevée
  border: "#334155",
  borderStrong: "#475569",

  // Surfaces (light mode — fallback si jamais)
  bgLight: "#ffffff",
  surfaceLight: "#f1f5f9",
  borderLight: "#e2e8f0",

  // Text
  text: "#f8fafc",
  textSecondary: "#cbd5e1",
  textMuted: "#94a3b8",
  textDark: "#0f172a",

  // Semantic
  success: "#10b981",
  successSoft: "rgba(16, 185, 129, 0.15)",
  successBorder: "rgba(16, 185, 129, 0.4)",
  successText: "#6ee7b7",
  error: "#ef4444",
  errorSoft: "rgba(239, 68, 68, 0.15)",
  errorBorder: "rgba(239, 68, 68, 0.4)",
  errorText: "#fca5a5",
  warn: "#f59e0b",
  warnSoft: "rgba(245, 158, 11, 0.15)",
  warnText: "#fde68a",
  info: "#0ea5e9",
  infoSoft: "rgba(14, 165, 233, 0.15)",
} as const;

export const colors = {
  // Always-dark scheme: le kioske est un appareil mural, on garde le thème
  // sombre en permanence pour économiser l'écran et garder le contraste
  // avec l'environnement de bureau.
  ...palette,
  bgTop: palette.bgDeep,
  bgBottom: palette.bg,
  accent: palette.teal,
  accentLight: palette.tealLight,
  buttonStart: palette.teal,
  buttonEnd: palette.tealDark,
  frame: "rgba(248, 250, 252, 0.85)",
  scrim: "rgba(2, 6, 23, 0.65)",
  scrimSoft: "rgba(2, 6, 23, 0.35)",
} as const;

export const lightTheme = {
  bg: palette.bgLight,
  surface: palette.surfaceLight,
  border: palette.borderLight,
  text: palette.textDark,
  textSecondary: "#475569",
  primary: palette.teal,
  primaryPressed: palette.tealDark,
  accentLine: "#FF9F1C",
  success: palette.success,
  error: palette.error,
};

export const darkTheme = {
  bg: palette.bg,
  surface: palette.surface,
  border: palette.border,
  text: palette.text,
  textSecondary: palette.textSecondary,
  textMuted: palette.textMuted,
  primary: palette.teal,
  primaryPressed: palette.tealDark,
  accent: palette.tealLight,
  success: palette.success,
  error: palette.error,
  buttonStart: palette.teal,
  buttonEnd: palette.tealDark,
  frame: colors.frame,
};

/** Spacing aligned on the employee-app scale (4-pt grid). */
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
  12: 48,
  16: 64,
  20: 80,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export const FontFamily = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "System",
});
