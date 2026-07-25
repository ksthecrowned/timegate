import {
  Pressable,
  StyleSheet,
  Text,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";

import { AuthHero, AuthScreen } from "@/components/auth/AuthScreen";
import {
  AuthAlert,
  AuthCard,
  AuthField,
  AuthLinkRow,
  AuthPrimaryButton,
} from "@/components/auth/AuthForm";
import { Spacing } from "@/constants/theme";
import { STRINGS } from "@/constants/strings";
import { useTheme } from "@/hooks/use-theme";
import { employeeApi } from "@/lib/api";
import {
  authenticateBiometric,
  clearBiometricCredentials,
  getStoredBiometricCredentials,
  isBiometricLoginAvailable,
  saveBiometricCredentials,
} from "@/lib/biometricAuth";
import { invalidateMeCache } from "@/lib/meCache";

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
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [hasStoredBiometricCredentials, setHasStoredBiometricCredentials] =
    useState(false);
  const [rememberBiometric, setRememberBiometric] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();

  useEffect(() => {
    void (async () => {
      const [available, stored] = await Promise.all([
        isBiometricLoginAvailable(),
        getStoredBiometricCredentials(),
      ]);
      setBiometricAvailable(available);
      setHasStoredBiometricCredentials(Boolean(stored));
      if (stored?.email) setEmail(stored.email);
    })();
  }, []);

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
      setPassword("");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : STRINGS.errors.networkError,
      );
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
      if (rememberBiometric && biometricAvailable) {
        await saveBiometricCredentials({
          email: normalizedEmail,
          password,
        });
        setHasStoredBiometricCredentials(true);
      } else if (hasStoredBiometricCredentials) {
        await clearBiometricCredentials();
        setHasStoredBiometricCredentials(false);
      }
      router.replace("/");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : STRINGS.auth.invalidCredentials,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setError(null);
    setInfo(null);
    const stored = await getStoredBiometricCredentials();
    if (!stored) {
      setError(STRINGS.auth.biometricMissingCredentials);
      setHasStoredBiometricCredentials(false);
      return;
    }
    const ok = await authenticateBiometric();
    if (!ok) return;

    setLoading(true);
    try {
      invalidateMeCache();
      setEmail(stored.email);
      await employeeApi.login({
        email: stored.email,
        password: stored.password,
      });
      router.replace("/");
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : STRINGS.auth.invalidCredentials,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen>
      <AuthHero
        icon={<Text style={styles.logoText}>TG</Text>}
        eyebrow={STRINGS.auth.login}
        title={STRINGS.app.name}
        subtitle={
          step === "password"
            ? STRINGS.auth.enterPasswordHint
            : STRINGS.auth.welcomeMessage
        }
      />

      <AuthAlert message={error} variant="error" />
      <AuthAlert message={info} variant="info" />

      <AuthCard>
        {biometricAvailable && hasStoredBiometricCredentials && step === "email" ? (
          <Pressable
            onPress={() => void handleBiometricLogin()}
            disabled={loading}
            style={({ pressed }) => [
              styles.biometricButton,
              {
                borderColor: theme.primary,
                opacity: pressed || loading ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons
              name="finger-print-outline"
              size={18}
              color={theme.primary}
            />
            <Text style={[styles.biometricButtonText, { color: theme.primary }]}>
              {STRINGS.auth.biometricSignIn}
            </Text>
          </Pressable>
        ) : null}

        <AuthField
          label={STRINGS.auth.email}
          placeholder="vous@entreprise.com"
          value={email}
          onChangeText={setEmail}
          editable={step === "email" && !loading}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType={step === "email" ? "next" : "done"}
          onSubmitEditing={() => {
            if (step === "email") void handleContinue();
          }}
          blurOnSubmit={step !== "email"}
        />

        {step === "password" ? (
          <Pressable
            onPress={() => {
              setStep("email");
              setPassword("");
              setError(null);
              setInfo(null);
            }}
            style={styles.changeEmail}
          >
            <Text style={{ color: theme.primary, fontSize: 13, fontWeight: "600" }}>
              {STRINGS.auth.changeEmail}
            </Text>
          </Pressable>
        ) : null}

        {step === "password" ? (
          <>
            <AuthField
              label={STRINGS.auth.password}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => void handleLogin()}
              editable={!loading}
              rightSlot={
                <Pressable
                  onPress={() => setShowPassword((s) => !s)}
                  hitSlop={8}
                  accessibilityLabel={
                    showPassword
                      ? STRINGS.auth.hidePassword
                      : STRINGS.auth.showPassword
                  }
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={theme.textSecondary}
                  />
                </Pressable>
              }
            />

            <Link href="/forgot-password" asChild>
              <Pressable hitSlop={8} style={styles.forgotLink}>
                <Text style={[styles.forgotText, { color: theme.primary }]}>
                  {STRINGS.auth.forgotPassword}
                </Text>
              </Pressable>
            </Link>

            {biometricAvailable ? (
              <Pressable
                onPress={() => setRememberBiometric((v) => !v)}
                style={styles.rememberRow}
              >
                <Ionicons
                  name={rememberBiometric ? "checkbox" : "square-outline"}
                  size={18}
                  color={theme.primary}
                />
                <Text
                  style={[styles.rememberText, { color: theme.textSecondary }]}
                >
                  {STRINGS.auth.enableBiometric}
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : null}

        <AuthPrimaryButton
          label={
            step === "email" ? STRINGS.auth.continue : STRINGS.auth.signIn
          }
          loading={loading}
          onPress={() =>
            void (step === "email" ? handleContinue() : handleLogin())
          }
        />
      </AuthCard>

      {info ? (
        <AuthLinkRow
          label={STRINGS.auth.forgotPassword}
          icon="key-outline"
          onPress={() =>
            router.push({
              pathname: "/forgot-password",
              params: normalizedEmail ? { email: normalizedEmail } : undefined,
            })
          }
        />
      ) : null}
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  logoText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
  },
  biometricButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: Spacing[3],
    marginBottom: Spacing[4],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[2],
  },
  biometricButtonText: { fontSize: 14, fontWeight: "600" },
  changeEmail: { marginTop: -Spacing[2], marginBottom: Spacing[4] },
  forgotLink: { alignSelf: "flex-end", marginBottom: Spacing[3], marginTop: -Spacing[2] },
  forgotText: { fontSize: 13, fontWeight: "600" },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[2],
    marginBottom: Spacing[2],
  },
  rememberText: { fontSize: 13, fontWeight: "500", flex: 1 },
});
