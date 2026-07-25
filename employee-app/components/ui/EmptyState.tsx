import { StyleSheet, Text, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MinTouchTarget, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon = "file-tray-outline",
  title,
  hint,
  actionLabel,
  onAction,
}: Props) {
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
      accessibilityRole="summary"
      accessibilityLabel={`${title}${hint ? `. ${hint}` : ""}`}
    >
      <Ionicons name={icon} size={48} color={theme.textMuted} />
      <Text style={[styles.title, { color: theme.textSecondary }]}>{title}</Text>
      {hint ? (
        <Text style={[styles.hint, { color: theme.textMuted }]}>{hint}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [
            styles.action,
            {
              backgroundColor: theme.primary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorState({
  message,
  onRetry,
  retryLabel = "Réessayer",
}: ErrorStateProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.errorCard,
        {
          backgroundColor: theme.dangerSoft,
          borderColor: theme.danger,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLabel={message}
    >
      <Text style={[styles.errorText, { color: theme.danger }]}>{message}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          style={({ pressed }) => [
            styles.retry,
            {
              borderColor: theme.danger,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.retryText, { color: theme.danger }]}>
            {retryLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: Spacing[4],
    padding: Spacing[8],
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: Spacing[3],
    textAlign: "center",
  },
  hint: {
    fontSize: 13,
    marginTop: Spacing[1],
    textAlign: "center",
    lineHeight: 18,
  },
  action: {
    marginTop: Spacing[4],
    minHeight: MinTouchTarget,
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  errorCard: {
    margin: Spacing[4],
    padding: Spacing[4],
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: Spacing[3],
  },
  errorText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  retry: {
    alignSelf: "center",
    minHeight: MinTouchTarget,
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  retryText: { fontWeight: "700", fontSize: 14 },
});
