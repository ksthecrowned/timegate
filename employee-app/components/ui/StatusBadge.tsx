import { StyleSheet, Text, View } from "react-native";

import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

type Props = {
  label: string;
  tone?: StatusTone;
};

export function StatusBadge({ label, tone = "neutral" }: Props) {
  const theme = useTheme();

  const palette =
    tone === "success"
      ? { bg: theme.successSoft, text: theme.success }
      : tone === "warning"
        ? { bg: theme.warningSoft, text: theme.warning }
        : tone === "danger"
          ? { bg: theme.dangerSoft, text: theme.danger }
          : tone === "info"
            ? { bg: theme.infoSoft, text: theme.info }
            : { bg: theme.surfaceMuted, text: theme.textSecondary };

  return (
    <View
      style={[styles.badge, { backgroundColor: palette.bg }]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Text style={[styles.text, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

export function statusToneFromLeave(status: string): StatusTone {
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
      return "danger";
    case "pending":
      return "warning";
    default:
      return "neutral";
  }
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing[2] + 2,
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
  },
  text: {
    fontSize: 12,
    fontWeight: "700",
  },
});
