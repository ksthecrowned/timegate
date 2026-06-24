import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors, Radius, Spacing } from "../../theme/colors";

type Variant = "error" | "success" | "warn" | "info";

type MessageBoxProps = {
  message: string | null | undefined;
  variant: Variant;
  style?: ViewStyle;
};

const VARIANT_STYLES: Record<
  Variant,
  { bg: string; border: string; text: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  error: {
    bg: colors.errorSoft,
    border: colors.errorBorder,
    text: colors.errorText,
    icon: "alert-circle",
  },
  success: {
    bg: colors.successSoft,
    border: colors.successBorder,
    text: colors.successText,
    icon: "checkmark-circle",
  },
  warn: {
    bg: colors.warnSoft,
    border: "rgba(245, 158, 11, 0.4)",
    text: colors.warnText,
    icon: "warning",
  },
  info: {
    bg: colors.infoSoft,
    border: "rgba(14, 165, 233, 0.4)",
    text: "#7dd3fc",
    icon: "information-circle",
  },
};

export function MessageBox({ message, variant, style }: MessageBoxProps) {
  if (!message) return null;
  const v = VARIANT_STYLES[variant];
  return (
    <View
      style={[
        styles.box,
        { backgroundColor: v.bg, borderColor: v.border },
        style,
      ]}
    >
      <Ionicons name={v.icon} size={18} color={v.text} style={styles.icon} />
      <Text style={[styles.text, { color: v.text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  icon: { marginRight: Spacing[2], marginTop: 2 },
  text: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "500" },
});
