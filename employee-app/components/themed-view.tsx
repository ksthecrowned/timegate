import { View, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  themeColor?: 'background' | 'backgroundElement' | 'backgroundSelected' | 'text' | 'textSecondary';
  type?: 'default' | 'backgroundElement' | 'backgroundSelected';
};

const TYPE_STYLES: Record<NonNullable<ThemedViewProps['type']>, ViewStyle> = {
  default: {},
  backgroundElement: { borderRadius: 12 },
  backgroundSelected: { borderRadius: 8 },
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  themeColor,
  type = 'default',
  ...rest
}: ThemedViewProps) {
  const theme = useTheme();
  const colorFromType =
    type === 'backgroundElement'
      ? theme.backgroundElement
      : type === 'backgroundSelected'
      ? (theme as any).backgroundSelected ?? theme.backgroundElement
      : null;
  const backgroundColor =
    lightColor ?? darkColor ?? themeColor
      ? (theme[themeColor as 'background'] as string) ?? theme.background
      : colorFromType ?? theme.background;

  return <View style={[{ backgroundColor }, TYPE_STYLES[type], style]} {...rest} />;
}
