import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AuthHero, AuthScreen } from "@/components/auth/AuthScreen";
import {
  AuthAlert,
  AuthBackButton,
  AuthCard,
  AuthPrimaryButton,
} from "@/components/auth/AuthForm";
import { Spacing } from "@/constants/theme";
import { STRINGS } from "@/constants/strings";
import { useTheme } from "@/hooks/use-theme";
import { employeeApi } from "@/lib/api";

const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyCodeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { email, setup } = useLocalSearchParams<{
    email: string;
    setup?: string;
  }>();
  const isSetup = setup === "1";
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
        params: {
          token: resetToken,
          email,
          ...(isSetup ? { setup: "1" } : {}),
        },
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : STRINGS.auth.codeInvalid,
      );
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
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : STRINGS.errors.networkError,
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthScreen>
      <AuthBackButton onPress={() => router.back()} />
      <AuthHero
        icon={
          <Ionicons name="shield-checkmark-outline" size={32} color="#fff" />
        }
        title={
          isSetup
            ? STRINGS.auth.verifyCodeSetupTitle
            : STRINGS.auth.verifyCodeTitle
        }
        subtitle={
          isSetup
            ? STRINGS.auth.verifyCodeSetupSubtitle
            : STRINGS.auth.verifyCodeSubtitle
        }
      />
      {email ? (
        <Text style={[styles.email, { color: theme.textSecondary }]}>
          {email}
        </Text>
      ) : null}

      <AuthAlert message={error} variant="error" />

      <AuthCard>
        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {STRINGS.auth.verifyCodeTitle}
        </Text>
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          placeholderTextColor={theme.textMuted}
          keyboardType="number-pad"
          maxLength={6}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          returnKeyType="done"
          onSubmitEditing={() => void handleSubmit()}
          style={[
            styles.codeInput,
            {
              color: theme.text,
              backgroundColor: theme.background,
              borderColor: theme.border,
            },
          ]}
          editable={!loading}
        />
        <AuthPrimaryButton
          label={STRINGS.app.confirm}
          loading={loading}
          disabled={code.length !== 6}
          onPress={() => void handleSubmit()}
        />
      </AuthCard>

      <View style={styles.resendRow}>
        {cooldown > 0 ? (
          <Text style={[styles.resendHint, { color: theme.textSecondary }]}>
            {STRINGS.auth.codeResendIn(cooldown)}
          </Text>
        ) : (
          <Pressable
            onPress={() => void handleResend()}
            disabled={resending}
            hitSlop={8}
          >
            <Text style={[styles.resendText, { color: theme.primary }]}>
              {resending ? STRINGS.app.loading : STRINGS.auth.codeResend}
            </Text>
          </Pressable>
        )}
      </View>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  email: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    marginTop: -Spacing[4],
    marginBottom: Spacing[4],
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: Spacing[2],
  },
  codeInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[3],
    fontSize: 28,
    letterSpacing: 10,
    textAlign: "center",
    fontWeight: "700",
    marginBottom: Spacing[2],
  },
  resendRow: {
    alignItems: "center",
    marginTop: Spacing[6],
  },
  resendHint: { fontSize: 13 },
  resendText: { fontSize: 14, fontWeight: "600" },
});
