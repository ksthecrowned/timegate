import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Spacing } from "@/constants/theme";
import { STRINGS } from "@/constants/strings";
import { useTheme } from "@/hooks/use-theme";

const R = { md: 10, xl: 16 } as const;

type AlertVariant = "error" | "info" | "success";

const ALERT_COLORS: Record<
  AlertVariant,
  { bg: string; border: string; text: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  error: {
    bg: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.35)",
    text: "#b91c1c",
    icon: "alert-circle",
  },
  info: {
    bg: "rgba(14, 165, 233, 0.12)",
    border: "rgba(14, 165, 233, 0.35)",
    text: "#0369a1",
    icon: "information-circle",
  },
  success: {
    bg: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.35)",
    text: "#047857",
    icon: "checkmark-circle",
  },
};

export function AuthAlert({
  message,
  variant = "error",
}: {
  message: string | null | undefined;
  variant?: AlertVariant;
}) {
  if (!message) return null;
  const c = ALERT_COLORS[variant];
  return (
    <View
      style={[
        styles.alert,
        { backgroundColor: c.bg, borderColor: c.border },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
    >
      <Ionicons name={c.icon} size={18} color={c.text} style={styles.alertIcon} />
      <Text style={[styles.alertText, { color: c.text }]}>{message}</Text>
    </View>
  );
}

export function AuthCard({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surfaceCard,
          borderColor: theme.border,
        },
      ]}
    >
      {children}
    </View>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  rightSlot?: ReactNode;
  testID?: string;
};

export function AuthField({ label, rightSlot, style, testID, ...props }: FieldProps) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text
        style={[styles.label, { color: theme.textSecondary }]}
        accessibilityRole="text"
      >
        {label}
      </Text>
      <View style={styles.fieldRow}>
        <TextInput
          testID={testID}
          accessibilityLabel={label}
          placeholderTextColor={theme.textMuted}
          style={[
            styles.input,
            rightSlot ? styles.inputWithRight : null,
            {
              color: theme.text,
              backgroundColor: theme.background,
              borderColor: theme.border,
            },
            style,
          ]}
          {...props}
        />
        {rightSlot ? <View style={styles.rightSlot}>{rightSlot}</View> : null}
      </View>
    </View>
  );
}

export function AuthPrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  testID,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  const theme = useTheme();
  const inactive = Boolean(loading || disabled);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: Boolean(loading) }}
      style={({ pressed }) => [
        styles.primaryBtn,
        {
          backgroundColor: theme.primary,
          opacity: pressed || inactive ? 0.7 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.primaryBtnText}>{label}</Text>
      )}
    </Pressable>
  );
}

export function AuthBackButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      style={styles.backBtn}
      accessibilityRole="button"
      accessibilityLabel={STRINGS.a11y.back}
    >
      <Ionicons name="chevron-back" size={24} color={theme.primary} />
    </Pressable>
  );
}

export function AuthLinkRow({
  label,
  onPress,
  icon = "arrow-back-outline",
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={styles.linkRow}
      accessibilityRole="link"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={16} color={theme.primary} />
      <Text style={[styles.linkText, { color: theme.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  alert: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: R.md,
    padding: Spacing[3],
    marginBottom: Spacing[4],
  },
  alertIcon: { marginRight: Spacing[2], marginTop: 1 },
  alertText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "500" },
  card: {
    borderRadius: R.xl,
    borderWidth: 1,
    padding: Spacing[5],
    gap: Spacing[1],
  },
  field: { marginBottom: Spacing[4] },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: Spacing[2],
  },
  fieldRow: { position: "relative", justifyContent: "center" },
  input: {
    borderWidth: 1,
    borderRadius: R.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    fontSize: 16,
  },
  inputWithRight: { paddingRight: 48 },
  rightSlot: {
    position: "absolute",
    right: Spacing[3],
    height: "100%",
    justifyContent: "center",
  },
  primaryBtn: {
    marginTop: Spacing[2],
    paddingVertical: Spacing[3] + 2,
    borderRadius: R.md,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[2],
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[2],
    marginTop: Spacing[6],
  },
  linkText: { fontSize: 14, fontWeight: "600" },
});
