import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import {
  shouldShowStatusDock,
  type ScanUiVerifyState,
} from "../../lib/scan-ui-state";
import { colors, Radius, Spacing } from "../../theme/colors";

export function StatusDock({
  verifyState,
  employeeName,
  errorMessage,
  pendingSyncCount,
}: {
  verifyState: ScanUiVerifyState;
  employeeName: string | null;
  errorMessage: string | null;
  pendingSyncCount: number;
}) {
  if (!shouldShowStatusDock(verifyState, pendingSyncCount)) return null;

  if (verifyState === "idle") {
    return <OfflineBadge pendingSyncCount={pendingSyncCount} />;
  }

  const title =
    verifyState === "verifying"
      ? "Vérification…"
      : verifyState === "success"
        ? employeeName
          ? `Bienvenue ${employeeName}`
          : "Pointage enregistré"
        : errorMessage?.trim() || "Échec de la vérification";

  const iconName =
    verifyState === "verifying"
      ? "sync"
      : verifyState === "success"
        ? "checkmark"
        : "close";

  return (
    <View
      style={[
        styles.card,
        verifyState === "success" && styles.cardSuccess,
        verifyState === "error" && styles.cardError,
      ]}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.icon,
            verifyState === "success" && styles.iconSuccess,
            verifyState === "error" && styles.iconError,
          ]}
        >
          <Ionicons name={iconName} size={24} color="#fff" />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <OfflineBadge pendingSyncCount={pendingSyncCount} />
    </View>
  );
}

function OfflineBadge({ pendingSyncCount }: { pendingSyncCount: number }) {
  if (pendingSyncCount <= 0) return null;

  return (
    <View style={styles.offlineBadge}>
      <Ionicons
        name="cloud-offline-outline"
        size={14}
        color={colors.warnText}
      />
      <Text style={styles.offlineText}>
        {`${pendingSyncCount} vérification(s) en attente de synchro`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    backgroundColor: "rgba(2, 6, 23, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(13, 148, 136, 0.4)",
    padding: Spacing[3],
    gap: Spacing[2],
  },
  cardSuccess: {
    borderColor: colors.successBorder,
    backgroundColor: "rgba(16, 185, 129, 0.18)",
  },
  cardError: {
    borderColor: colors.errorBorder,
    backgroundColor: "rgba(239, 68, 68, 0.18)",
  },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing[3] },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSuccess: { backgroundColor: colors.success },
  iconError: { backgroundColor: colors.error },
  title: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[1],
    alignSelf: "flex-start",
    backgroundColor: colors.warnSoft,
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
  },
  offlineText: {
    color: colors.warnText,
    fontSize: 12,
    fontWeight: "600",
  },
});
