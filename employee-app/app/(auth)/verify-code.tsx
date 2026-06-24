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
import { useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { BottomTabInset, Spacing } from "@/constants/theme";
import { STRINGS } from "@/constants/strings";
import { useTheme } from "@/hooks/use-theme";
import { employeeApi } from "@/lib/api";

const S = Spacing; // numeric-keyed alias
const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyCodeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => {
      setCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleSubmit = async () => {
    setError(null);
    if (!email) {
      setError(STRINGS.errors.required);
      return;
    }
    if (code.length !== 6) {
      setError(STRINGS.auth.codeInvalid);
      return;
    }
    setLoading(true);
    try {
      const { resetToken } = await employeeApi.verifyResetCode(email, code);
      router.push({
        pathname: "/reset-password",
        params: { token: resetToken, email },
      });
    } catch (err: any) {
      setError(err?.message ?? STRINGS.auth.codeInvalid);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    setResending(true);
    setError(null);
    try {
      await employeeApi.forgotPassword(email);
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      setError(err?.message ?? STRINGS.errors.networkError);
    } finally {
      setResending(false);
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
            <Ionicons name="shield-checkmark-outline" size={32} color="#fff" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>
            {STRINGS.auth.verifyCodeTitle}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {STRINGS.auth.verifyCodeSubtitle}
          </Text>
          {email ? (
            <Text style={[styles.email, { color: theme.textSecondary }]}>
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
              {STRINGS.auth.verifyCodeTitle}
            </Text>
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              maxLength={6}
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.background },
              ]}
              editable={!loading}
            />
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={loading || code.length !== 6}
            style={({ pressed }) => [
              styles.submitButton,
              {
                backgroundColor: theme.tint,
                opacity: pressed || loading || code.length !== 6 ? 0.5 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {STRINGS.app.confirm}
              </Text>
            )}
          </Pressable>
        </View>

        <View style={styles.resendRow}>
          {cooldown > 0 ? (
            <Text style={[styles.resendHint, { color: theme.textSecondary }]}>
              {STRINGS.auth.codeResendIn(cooldown)}
            </Text>
          ) : (
            <Pressable
              onPress={handleResend}
              disabled={resending}
              hitSlop={8}
            >
              <Text style={[styles.resendText, { color: theme.tint }]}>
                {resending ? STRINGS.app.loading : STRINGS.auth.codeResend}
              </Text>
            </Pressable>
          )}
        </View>
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
  email: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: S[2],
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
  input: {
    borderRadius: S[2],
    paddingHorizontal: S[3],
    paddingVertical: S[3],
    fontSize: 28,
    letterSpacing: 12,
    textAlign: "center",
    fontWeight: "700",
  },
  submitButton: {
    paddingVertical: S[3],
    borderRadius: S[2],
    alignItems: "center",
    marginTop: S[2],
  },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  resendRow: {
    alignItems: "center",
    marginTop: S[6],
  },
  resendHint: { fontSize: 13 },
  resendText: { fontSize: 14, fontWeight: "600" },
});