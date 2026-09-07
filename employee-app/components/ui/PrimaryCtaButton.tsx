import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Radius, Spacing, primaryCtaGradient } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  accessibilityHint?: string;
  /** Optional leading icon or custom content instead of label text. */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Primary CTA matching dashboard login:
 * `bg-linear-to-r from-primary to-secondary` (#0d9488 → #0284c7).
 */
export function PrimaryCtaButton({
  label,
  onPress,
  loading,
  disabled,
  testID,
  accessibilityHint,
  children,
  style,
  contentStyle,
}: Props) {
  const scheme = useColorScheme();
  const inactive = Boolean(loading || disabled);
  const colors = primaryCtaGradient(
    scheme === 'unspecified' ? 'light' : scheme,
  );

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.wrap,
        { opacity: pressed || inactive ? 0.75 : 1 },
        style,
      ]}
    >
      <LinearGradient
        colors={[...colors]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.gradient, contentStyle]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : children ? (
          children
        ) : (
          <Text style={styles.label}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: Spacing[3] + 2,
    paddingHorizontal: Spacing[4],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
