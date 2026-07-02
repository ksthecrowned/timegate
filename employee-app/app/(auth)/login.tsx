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
import { invalidateMeCache } from "@/lib/meCache";

const S = Spacing;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Step = "email" | "password";

export default function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const normalizedEmail = email.trim().toLowerCase();

  const handleContinue = async () => {
    setError(null);
    setInfo(null);
    if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      setError(STRINGS.errors.invalidEmail);
      return;
    }
    setLoading(true);
    try {
      const { nextStep } = await employeeApi.identify(normalizedEmail);
      if (nextStep === "CHECK_EMAIL") {
        setInfo(STRINGS.auth.checkEmailHint);
        return;
      }
      if (nextStep === "OTP_SETUP") {
        await employeeApi.forgotPassword(normalizedEmail);
        router.push({
          pathname: "/verify-code",
          params: { email: normalizedEmail, setup: "1" },
        });
        return;
      }
      setStep("password");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : STRINGS.errors.networkError;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError(null);
    if (!password) {
      setError(STRINGS.leave.fillAllFields);
      return;
    }
    setLoading(true);
    try {
      invalidateMeCache();
      await employeeApi.login({ email: normalizedEmail, password });
      router.replace("/");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : STRINGS.auth.invalidCredentials;
      setError(message);
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
        <View style={styles.hero}>
          <View style={[styles.logoBubble, { backgroundColor: theme.tint }]}>
            <Text style={styles.logoText}>TG</Text>
          </View>
          <Text style={[styles.title, { color: theme.text }]}>
            {STRINGS.app.name}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {STRINGS.auth.welcomeMessage}
          </Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        {info && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>{info}</Text>
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
              editable={step === "email"}
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.background,
                  opacity: step === "password" ? 0.7 : 1,
                },
              ]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
            />
            {step === "password" && (
              <Pressable onPress={() => setStep("email")} style={styles.changeEmail}>
                <Text style={{ color: theme.tint, fontSize: 13 }}>
                  Changer d&apos;e-mail
                </Text>
              </Pressable>
            )}
          </View>

          {step === "password" && (
            <>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  {STRINGS.auth.password}
                </Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor={theme.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    style={[
                      styles.passwordInput,
                      { color: theme.text, backgroundColor: theme.background },
                    ]}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    textContentType="password"
                  />
                  <Pressable
                    onPress={() => setShowPassword((s) => !s)}
                    hitSlop={8}
                    style={styles.eyeButton}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </Pressable>
                </View>
              </View>

              <Link href="/forgot-password" asChild>
                <Pressable hitSlop={8} style={styles.forgotLink}>
                  <Text style={[styles.forgotText, { color: theme.tint }]}>
                    {STRINGS.auth.forgotPassword}
                  </Text>
                </Pressable>
              </Link>
            </>
          )}

          <Pressable
            onPress={step === "email" ? handleContinue : handleLogin}
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
                {step === "email" ? STRINGS.auth.continue : STRINGS.auth.signIn}
              </Text>
            )}
          </Pressable>
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
    paddingTop: S[8] || S[6] * 2,
    alignItems: "stretch",
    flexGrow: 1,
  },
  hero: { alignItems: "center", marginBottom: S[6] },
  logoBubble: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: S[4],
  },
  logoText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: S[2],
    letterSpacing: -0.5,
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
  infoBox: {
    backgroundColor: "#E8F4FD",
    borderRadius: S[2],
    padding: S[3],
    marginBottom: S[3],
  },
  infoText: { color: "#1d4ed8", fontSize: 14, textAlign: "center" },
  formCard: { borderRadius: S[4], padding: S[4] },
  inputGroup: { marginBottom: S[4] },
  changeEmail: { marginTop: S[2] },
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
  forgotLink: { alignSelf: "flex-end", marginBottom: S[4], marginTop: -S[2] },
  forgotText: { fontSize: 13, fontWeight: "600" },
  submitButton: {
    paddingVertical: S[3],
    borderRadius: S[2],
    alignItems: "center",
    marginTop: S[2],
  },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
