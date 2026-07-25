import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AuthHero, AuthScreen } from "@/components/auth/AuthScreen";
import {
  AuthAlert,
  AuthBackButton,
  AuthCard,
  AuthField,
  AuthLinkRow,
  AuthPrimaryButton,
} from "@/components/auth/AuthForm";
import { STRINGS } from "@/constants/strings";
import { employeeApi } from "@/lib/api";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
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
      router.push({ pathname: "/verify-code", params: { email: trimmed } });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : STRINGS.errors.networkError,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen>
      <AuthBackButton onPress={() => router.back()} />
      <AuthHero
        icon={<Ionicons name="mail-outline" size={32} color="#fff" />}
        title={STRINGS.auth.forgotPasswordTitle}
        subtitle={STRINGS.auth.forgotPasswordSubtitle}
      />

      <AuthAlert message={error} variant="error" />
      <AuthAlert
        message={sent && !error ? STRINGS.auth.codeSent : null}
        variant="success"
      />

      <AuthCard>
        <AuthField
          label={STRINGS.auth.email}
          placeholder="vous@entreprise.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={() => void handleSubmit()}
          editable={!loading}
        />
        <AuthPrimaryButton
          label={STRINGS.auth.sendCode}
          loading={loading}
          onPress={() => void handleSubmit()}
        />
      </AuthCard>

      <AuthLinkRow
        label={STRINGS.auth.backToLogin}
        onPress={() => router.replace("/login")}
      />
    </AuthScreen>
  );
}
