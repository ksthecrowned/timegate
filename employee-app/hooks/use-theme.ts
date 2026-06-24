/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors, ThemeAliases } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type AppTheme = (typeof Colors)['light'] & {
  [K in keyof typeof ThemeAliases]: (typeof Colors)['light'][typeof ThemeAliases[K]];
};

export function useTheme(): AppTheme {
  const scheme = useColorScheme();
  const key = scheme === 'unspecified' ? 'light' : scheme;
  const base = Colors[key];

  // Inject aliases only if the canonical key isn't already present.
  const aliased = { ...base } as Record<string, string>;
  for (const [alias, target] of Object.entries(ThemeAliases)) {
    if (!(alias in base)) {
      aliased[alias] = base[target as keyof typeof base] as string;
    }
  }
  return aliased as AppTheme;
}