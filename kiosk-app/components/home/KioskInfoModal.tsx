import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { getStoredKioskDetails, type KioskDetails } from "../../lib/timegate";
import { colors, Radius, Spacing } from "../../theme/colors";
import { formatEnabledModes } from "./punch-modes";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text selectable style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

type KioskInfoModalProps = {
  visible: boolean;
  onClose: () => void;
  faceEnabled: boolean;
  nfcEnabled: boolean;
  qrEnabled: boolean;
};

export function KioskInfoModal({
  visible,
  onClose,
  faceEnabled,
  nfcEnabled,
  qrEnabled,
}: KioskInfoModalProps) {
  const [details, setDetails] = useState<KioskDetails | null>(null);

  useEffect(() => {
    if (!visible) return;
    void getStoredKioskDetails().then(setDetails);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={styles.modalCard}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Informations borne</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              onPress={onClose}
              style={styles.modalCloseBtn}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.modalBody}>
            <DetailRow
              label="Appareil"
              value={details?.name ?? "Chargement..."}
            />
            <DetailRow
              label="Identifiant"
              value={details?.id ?? "Chargement..."}
            />
            <DetailRow
              label="Modes actifs"
              value={formatEnabledModes({ faceEnabled, nfcEnabled, qrEnabled })}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.72)",
    justifyContent: "center",
    paddingHorizontal: Spacing[5],
  },
  modalCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[5],
    paddingBottom: Spacing[3],
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
  },
  modalBody: {
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[5],
    gap: Spacing[3],
  },
  detailRow: { gap: Spacing[1] },
  detailLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  detailValue: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 21,
  },
});
