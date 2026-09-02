import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createKioskIdempotencyKey,
  getProvisionState,
  verifyKioskPin,
  classifyError,
  type ErrorCategory,
} from "../lib/timegate";
import { Brand } from "../components/shared/Brand";
import { MessageBox } from "../components/shared/MessageBox";
import { PrimaryButton } from "../components/shared/PrimaryButton";
import { colors, Radius, Spacing } from "../theme/colors";

export default function PinScreen() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [feedback, setFeedback] = useState<
    | { kind: "success" | "error" | "warn" | "info"; message: string }
    | null
  >(null);

  async function onVerify() {
    setLoading(true);
    setFeedback(null);
    try {
      const state = await getProvisionState();
      if (!state.hasToken) {
        setFeedback({
          kind: "warn",
          message: "Appareil non configuré. Revenez à l'accueil pour le configurer.",
        });
        setLoading(false);
        return;
      }
      const result = await verifyKioskPin(employeeId, pin, {
        idempotencyKey: createKioskIdempotencyKey("verify-pin"),
      });
      setFeedback({
        kind: result.success ? "success" : "error",
        message: result.message,
      });
      if (result.success) {
        Speech.speak(result.message || "Pointage enregistré.", {
          language: "fr-FR",
          onError: () => undefined,
        });
        setTimeout(() => router.replace("/"), 2000);
      }
    } catch (e) {
      const kind: ErrorCategory = classifyError(e);
      const map: Record<ErrorCategory, "error" | "warn" | "info"> = {
        error: "error",
        warn: "warn",
        info: "info",
      };
      setFeedback({
        kind: map[kind],
        message:
          e instanceof Error
            ? e.message
            : "Vérification impossible. Réessayez.",
      });
    } finally {
      setLoading(false);
    }
  }

  const canSubmit =
    !loading && employeeId.trim().length >= 3 && pin.length >= 4;

  return (
    <LinearGradient
      colors={[colors.bgTop, colors.bgBottom]}
      style={styles.root}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Pressable
              onPress={() => router.back()}
              style={styles.back}
              hitSlop={12}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={colors.tealLight}
              />
              <Text style={styles.backText}>Retour au scan</Text>
            </Pressable>

            <View style={{ marginBottom: Spacing[5] }}>
              <Brand subtitle="Saisie manuelle" size="sm" />
            </View>

            <View style={styles.panel}>
              <Text style={styles.title}>Pointage par PIN</Text>
              <Text style={styles.sub}>
                Solution de secours si la reconnaissance faciale ne fonctionne
                pas. Demandez à l'employé de saisir son identifiant et son code
                PIN.
              </Text>

              {feedback ? (
                <MessageBox
                  variant={feedback.kind}
                  message={feedback.message}
                />
              ) : null}

              <Text style={styles.label}>Identifiant employé</Text>
              <TextInput
                style={styles.input}
                value={employeeId}
                onChangeText={setEmployeeId}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder="EMP-1234"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>PIN (4 à 6 chiffres)</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1, paddingRight: 40 }]}
                  value={pin}
                  onChangeText={(v) => setPin(v.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  secureTextEntry={!showPin}
                  placeholder="••••"
                  placeholderTextColor={colors.textMuted}
                />
                <Pressable
                  onPress={() => setShowPin((v) => !v)}
                  style={styles.eyeBtn}
                  hitSlop={8}
                >
                  <Ionicons
                    name={showPin ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>

              <PrimaryButton
                label={loading ? "Vérification..." : "Valider le pointage"}
                onPress={() => void onVerify()}
                disabled={!canSubmit}
                loading={loading}
                trailingIcon="checkmark-circle-outline"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  content: { padding: Spacing[5], gap: Spacing[4] },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[1],
    marginBottom: Spacing[2],
  },
  backText: { color: colors.tealLight, fontWeight: "600" },
  panel: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: Spacing[5],
    gap: Spacing[2],
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.3,
  },
  sub: {
    color: colors.textSecondary,
    marginBottom: Spacing[2],
    lineHeight: 20,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginTop: Spacing[2],
  },
  input: {
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    color: colors.text,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    fontSize: 15,
  },
  passwordRow: { position: "relative", justifyContent: "center" },
  eyeBtn: {
    position: "absolute",
    right: Spacing[3],
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
