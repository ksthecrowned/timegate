import { Ionicons } from "@expo/vector-icons";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MessageBox } from "../shared/MessageBox";
import { PrimaryButton } from "../shared/PrimaryButton";
import { OperatorLoginFields } from "./OperatorLoginFields";
import { TimeGateLogo } from "../brand/TimeGateLogo";
import { Radius, Spacing } from "../../theme/colors";

type ReconfigureAuthModalProps = {
  visible: boolean;
  email: string;
  password: string;
  sku: string;
  showPassword: boolean;
  submitting: boolean;
  errorMessage: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSkuChange: (value: string) => void;
  onTogglePassword: () => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ReconfigureAuthModal({
  visible,
  email,
  password,
  sku,
  showPassword,
  submitting,
  errorMessage,
  onEmailChange,
  onPasswordChange,
  onSkuChange,
  onTogglePassword,
  onCancel,
  onConfirm,
}: ReconfigureAuthModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={onCancel} hitSlop={8} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#0f172a" />
          </Pressable>
        </View>

        <View style={styles.body}>
          <TimeGateLogo variant="icon" tone="on-light" style={styles.icon} />
          <Text style={styles.title}>Réauthentification requise</Text>
          <Text style={styles.subtitle}>
            Saisissez les identifiants administrateur pour reconfigurer ce
            kiosque.
          </Text>

          {errorMessage ? (
            <MessageBox variant="error" message={errorMessage} />
          ) : null}

          <OperatorLoginFields
            email={email}
            password={password}
            sku={sku}
            showPassword={showPassword}
            onEmailChange={onEmailChange}
            onPasswordChange={onPasswordChange}
            onSkuChange={onSkuChange}
            onTogglePassword={onTogglePassword}
          />

          <PrimaryButton
            label={submitting ? "Vérification..." : "Confirmer et reconfigurer"}
            onPress={onConfirm}
            disabled={submitting || !email.trim() || !password || !sku.trim()}
            loading={submitting}
          />
          <PrimaryButton
            label="Annuler"
            onPress={onCancel}
            disabled={submitting}
            variant="secondary"
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    paddingTop: Spacing[6],
    paddingHorizontal: Spacing[4],
    alignItems: "flex-end",
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e2e8f0",
  },
  body: {
    flex: 1,
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[6],
    gap: Spacing[3],
  },
  icon: {
    width: 56,
    height: 56,
    alignSelf: "center",
  },
  title: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: Spacing[2],
  },
});
