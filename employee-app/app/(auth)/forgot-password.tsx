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
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { BottomTabInset, Spacing } from "@/constants/theme";
import { STRINGS } from "@/constants/strings";
import { useTheme } from "@/hooks/use-theme";
import { employeeApi } from "@/lib/api";

const S = Spacing; // numeric-keyed alias
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError(STRINGS.errors.required);
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setError(STRINGS.errors.invalidEmail);
      return;
    }
    setLoading(true);
    try {
      await employeeApi.forgotPassword(trimmed);
      setSent(true);
      // Move to the code entry screen — user will type the OTP from their inbox.
      router.push({ pathname: "/verify-code", params: { email: trimmed } });
    } catch (err: any) {
      setError(err?.message ?? STRINGS.errors.networkError);
    } finally {
      setLoading(false);
    }
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

        <View style={styles.hero}>
          <View style={[styles.iconBubble, { backgroundColor: theme.tint }]}>
            <Ionicons name="mail-outline" size={32} color="#fff" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>
            {STRINGS.auth.forgotPasswordTitle}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {STRINGS.auth.forgotPasswordSubtitle}
          </Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {sent && !error && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{STRINGS.auth.codeSent}</Text>
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
              {STRINGS.auth.email}
            </Text>
            <TextInput
              placeholder="you@example.com"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.background },
              ]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              editable={!loading}
            />
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: theme.tint, opacity: pressed || loading ? 0.7 : 1 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {STRINGS.auth.sendCode}
              </Text>
            )}
          </Pressable>
        </View>

        <Link href="/login" asChild>
          <Pressable hitSlop={8} style={styles.backToLogin}>
            <Ionicons
              name="arrow-back-outline"
              size={16}
              color={theme.tint}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.backToLoginText, { color: theme.tint }]}>
              {STRINGS.auth.backToLogin}
            </Text>
          </Pressable>
        </Link>
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
    lineHeight: 20,
    paddingHorizontal: S[4],
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
  successBox: {
    backgroundColor: "#D5F5E3",
    borderRadius: S[2],
    padding: S[3],
    marginBottom: S[3],
  },
  successText: {
    color: "#1E8449",
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
  input: {
    borderRadius: S[2],
    paddingHorizontal: S[3],
    paddingVertical: S[3],
    fontSize: 16,
  },
  submitButton: {
    paddingVertical: S[3],
    borderRadius: S[2],
    alignItems: "center",
    marginTop: S[2],
  },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  backToLogin: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: S[6],
  },
  backToLoginText: { fontSize: 14, fontWeight: "600" },
});
