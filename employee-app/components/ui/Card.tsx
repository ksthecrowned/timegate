import { Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import type { ReactNode } from "react";

import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type Props = {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
};

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  disabled,
}: Props) {
  const theme = useTheme();
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled: Boolean(disabled) }}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.surfaceCard,
            borderColor: theme.border,
            opacity: pressed || disabled ? 0.7 : disabled ? 0.5 : 1,
          },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surfaceCard,
          borderColor: theme.border,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing[4],
  },
});
