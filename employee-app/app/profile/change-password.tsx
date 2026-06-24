import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { BottomTabInset, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import { employeeApi } from '@/lib/api';

const S = Spacing;
const MIN_PASSWORD_LENGTH = 8;

export default function ChangePasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!current) {
      setError(STRINGS.errors.required);
      return;
    }
    if (next.length < MIN_PASSWORD_LENGTH) {
      setError(STRINGS.auth.passwordTooShort);
      return;
    }
    if (next !== confirm) {
      setError(STRINGS.auth.passwordMismatch);
      return;
    }
    setSaving(true);
    try {
      await employeeApi.changePassword(current, next);
      router.back();
    } catch (err: any) {
      setError(err?.message ?? STRINGS.errors.networkError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={[styles.headerLink, { color: theme.tint }]}>
              {STRINGS.app.back}
            </Text>
          </Pressable>
          <Text style={[styles.title, { color: theme.text }]}>
            {STRINGS.profile.changePassword}
          </Text>
          <View style={{ width: 60 }} />
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
          <PasswordField
            label={STRINGS.profile.currentPassword}
            value={current}
            onChange={setCurrent}
            visible={showCurrent}
            onToggle={() => setShowCurrent((s) => !s)}
            disabled={saving}
            theme={theme}
          />

          <PasswordField
            label={STRINGS.auth.newPassword}
            value={next}
            onChange={setNext}
            visible={showNext}
            onToggle={() => setShowNext((s) => !s)}
            disabled={saving}
            theme={theme}
          />

          <PasswordField
            label={STRINGS.auth.confirmPassword}
            value={confirm}
            onChange={setConfirm}
            visible={showConfirm}
            onToggle={() => setShowConfirm((s) => !s)}
            disabled={saving}
            theme={theme}
          />

          <Pressable
            onPress={handleSubmit}
            disabled={saving}
            style={({ pressed }) => [
              styles.submitButton,
              { backgroundColor: theme.tint, opacity: pressed || saving ? 0.7 : 1 },
            ]}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>{STRINGS.app.save}</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  visible: boolean;
  onToggle: () => void;
  disabled: boolean;
  theme: ReturnType<typeof useTheme>;
};

function PasswordField({
  label,
  value,
  onChange,
  visible,
  onToggle,
  disabled,
  theme,
}: PasswordFieldProps) {
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <View style={styles.passwordRow}>
        <TextInput
          value={value}
          onChangeText={onChange}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
          style={[
            styles.passwordInput,
            { color: theme.text, backgroundColor: theme.background },
          ]}
          placeholder="••••••••"
          placeholderTextColor={theme.textSecondary}
        />
        <Pressable onPress={onToggle} hitSlop={8} style={styles.eyeButton}>
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={theme.textSecondary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  contentContainer: {
    paddingHorizontal: S[4],
    paddingTop: S[4],
    alignItems: 'stretch',
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: S[4],
  },
  headerLink: { fontSize: 14, fontWeight: '600', minWidth: 60 },
  title: { fontSize: 18, fontWeight: '700' },
  errorBox: {
    backgroundColor: '#FADBD8',
    borderRadius: S[2],
    padding: S[3],
    marginBottom: S[3],
  },
  errorText: {
    color: '#C0392B',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  formCard: { borderRadius: S[4], padding: S[4] },
  inputGroup: { marginBottom: S[4] },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: S[2],
  },
  passwordRow: { position: 'relative', justifyContent: 'center' },
  passwordInput: {
    borderRadius: S[2],
    paddingHorizontal: S[3],
    paddingVertical: S[3],
    paddingRight: 48,
    fontSize: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: S[3],
    height: '100%',
    justifyContent: 'center',
  },
  submitButton: {
    paddingVertical: S[3],
    borderRadius: S[2],
    alignItems: 'center',
    marginTop: S[2],
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});