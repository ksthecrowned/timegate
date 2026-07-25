import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { AuthHero, AuthScreen } from "@/components/auth/AuthScreen";
import {
  AuthAlert,
  AuthBackButton,
  AuthCard,
  AuthField,
  AuthPrimaryButton,
} from "@/components/auth/AuthForm";
import { Spacing } from "@/constants/theme";
import { STRINGS } from "@/constants/strings";
import { useTheme } from "@/hooks/use-theme";
import { employeeApi } from "@/lib/api";
import { invalidateMeCache } from "@/lib/meCache";

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
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : STRINGS.errors.networkError,
      );
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthScreen>
        <View style={styles.doneWrap}>
          <View style={[styles.iconBubble, { backgroundColor: "#059669" }]}>
            <Ionicons name="checkmark-circle" size={36} color="#fff" />
          </View>
          <Text style={[styles.doneTitle, { color: theme.text }]}>
            {isSetup ? STRINGS.auth.setupSuccess : STRINGS.auth.resetSuccess}
          </Text>
          {!isSetup ? (
            <AuthPrimaryButton
              label={STRINGS.auth.backToLogin}
              onPress={() => router.replace("/login")}
            />
          ) : null}
        </View>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <AuthBackButton onPress={() => router.back()} />
      <AuthHero
        icon={<Ionicons name="lock-closed-outline" size={32} color="#fff" />}
        title={
          isSetup
            ? STRINGS.auth.setupPasswordTitle
            : STRINGS.auth.resetPasswordTitle
        }
        subtitle={email}
      />

      <AuthAlert message={error} variant="error" />

      <AuthCard>
        <AuthField
          label={STRINGS.auth.newPassword}
          placeholder="••••••••"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showNew}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          returnKeyType="next"
          editable={!loading}
          rightSlot={
            <Pressable onPress={() => setShowNew((s) => !s)} hitSlop={8}>
              <Ionicons
                name={showNew ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>
          }
        />
        <AuthField
          label={STRINGS.auth.confirmPassword}
          placeholder="••••••••"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirm}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={() => void handleSubmit()}
          editable={!loading}
          rightSlot={
            <Pressable onPress={() => setShowConfirm((s) => !s)} hitSlop={8}>
              <Ionicons
                name={showConfirm ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={theme.textSecondary}
              />
            </Pressable>
          }
        />
        <AuthPrimaryButton
          label={STRINGS.app.save}
          loading={loading}
          onPress={() => void handleSubmit()}
        />
      </AuthCard>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  doneWrap: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing[8],
    gap: Spacing[4],
  },
  iconBubble: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  doneTitle: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: Spacing[2],
    paddingHorizontal: Spacing[4],
  },
});
