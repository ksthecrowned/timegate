import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  themeColor?: 'text' | 'textSecondary' | 'background' | 'backgroundElement';
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link' | 'small' | 'smallBold' | 'code';
};

const TYPE_STYLES: Record<NonNullable<ThemedTextProps['type']>, TextStyle> = {
  default: { fontSize: 16, lineHeight: 24 },
  defaultSemiBold: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  title: { fontSize: 32, fontWeight: '700', lineHeight: 32 },
  subtitle: { fontSize: 20, fontWeight: '700' },
  link: { fontSize: 16, color: '#0a7ea4' },
  small: { fontSize: 14, lineHeight: 20 },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  code: { fontFamily: 'monospace', fontSize: 14, lineHeight: 20 },
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  themeColor = 'text',
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const color =
    lightColor ?? darkColor ?? (theme[themeColor] as string) ?? theme.text;

  return <Text style={[{ color }, TYPE_STYLES[type], style]} {...rest} />;
}
