import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
} from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { BottomTabInset, Spacing } from "@/constants/theme";
import { STRINGS } from "@/constants/strings";
import { useTheme } from "@/hooks/use-theme";
import { employeeApi } from "@/lib/api";
import { invalidateMeCache } from "@/lib/meCache";

const S = Spacing; // numeric-keyed alias
const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { token, email, setup } = useLocalSearchParams<{
    token: string;
    email: string;
    setup?: string;
  }>();
  const isSetup = setup === "1";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    if (!token) {
      setError(STRINGS.auth.codeInvalid);
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(STRINGS.auth.passwordTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(STRINGS.auth.passwordMismatch);
      return;
    }
    setLoading(true);
    try {
      await employeeApi.resetPassword(token, newPassword);
      if (isSetup && email) {
        invalidateMeCache();
        await employeeApi.login({ email, password: newPassword });
        router.replace("/");
        return;
      }
      setDone(true);
    } catch (err: any) {
      setError(err?.message ?? STRINGS.errors.networkError);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    // Use replace so the user can't navigate back into the reset flow.
    router.replace("/login");
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: BottomTabInset + S[6] },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color={theme.tint} />
          </Pressable>
        </View>

        {done ? (
          <View style={styles.doneWrap}>
            <View style={[styles.iconBubble, { backgroundColor: "#1E8449" }]}>
              <Ionicons name="checkmark-circle" size={36} color="#fff" />
            </View>
            <Text style={[styles.title, { color: theme.text }]}>
              {isSetup ? STRINGS.auth.setupSuccess : STRINGS.auth.resetSuccess}
            </Text>
            {!isSetup && (
              <Pressable
                onPress={handleBackToLogin}
                style={({ pressed }) => [
                  styles.submitButton,
                  { backgroundColor: theme.tint, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.submitButtonText}>
                  {STRINGS.auth.backToLogin}
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          <>
            <View style={styles.hero}>
              <View style={[styles.iconBubble, { backgroundColor: theme.tint }]}>
                <Ionicons name="lock-closed-outline" size={32} color="#fff" />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>
                {isSetup ? STRINGS.auth.setupPasswordTitle : STRINGS.auth.resetPasswordTitle}
              </Text>
              {email ? (
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  {email}
                </Text>
              ) : null}
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View
              style={[
                styles.formCard,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  {STRINGS.auth.newPassword}
                </Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="••••••••"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.passwordInput,
                      {
                        color: theme.text,
                        backgroundColor: theme.background,
                      },
                    ]}
                    secureTextEntry={!showNew}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
                    editable={!loading}
                  />
                  <Pressable
                    onPress={() => setShowNew((s) => !s)}
                    hitSlop={8}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showNew ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  {STRINGS.auth.confirmPassword}
                </Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••"
                    placeholderTextColor={theme.textSecondary}
                    style={[
                      styles.passwordInput,
                      {
                        color: theme.text,
                        backgroundColor: theme.background,
                      },
                    ]}
                    secureTextEntry={!showConfirm}
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="newPassword"
                    editable={!loading}
                  />
                  <Pressable
                    onPress={() => setShowConfirm((s) => !s)}
                    hitSlop={8}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showConfirm ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>

              <Pressable
                onPress={handleSubmit}
                disabled={loading}
                style={({ pressed }) => [
                  styles.submitButton,
                  {
                    backgroundColor: theme.tint,
                    opacity: pressed || loading ? 0.7 : 1,
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>
                    {STRINGS.app.save}
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  contentContainer: {
    paddingHorizontal: S[4],
    paddingTop: S[4],
    alignItems: "stretch",
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: S[4],
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  hero: { alignItems: "center", marginBottom: S[6] },
  doneWrap: { alignItems: "center", marginTop: S[6] },
  iconBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: S[4],
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: S[2],
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
  },
  errorBox: {
    backgroundColor: "#FADBD8",
    borderRadius: S[2],
    padding: S[3],
    marginBottom: S[3],
  },
  errorText: {
    color: "#C0392B",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  formCard: {
    borderRadius: S[4],
    padding: S[4],
  },
  inputGroup: { marginBottom: S[4] },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: S[2],
  },
  passwordRow: { position: "relative", justifyContent: "center" },
  passwordInput: {
    borderRadius: S[2],
    paddingHorizontal: S[3],
    paddingVertical: S[3],
    paddingRight: 48,
    fontSize: 16,
  },
  eyeButton: {
    position: "absolute",
    right: S[3],
    height: "100%",
    justifyContent: "center",
  },
  submitButton: {
    paddingVertical: S[3],
    borderRadius: S[2],
    alignItems: "center",
    marginTop: S[2],
    alignSelf: "stretch",
  },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});