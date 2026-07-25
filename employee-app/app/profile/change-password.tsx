import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenLayout } from '@/components/ScreenLayout';
import {
  FormCard,
  FormError,
  FormPasswordInput,
  FormPrimaryButton,
} from '@/components/ui/Form';
import { Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { employeeApi } from '@/lib/api';

const S = Spacing;
const MIN_PASSWORD_LENGTH = 8;

export default function ChangePasswordScreen() {
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
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : STRINGS.errors.networkError,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout
      title={STRINGS.profile.changePassword}
      showBack
      showNotifications={false}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrap}
      >
        <FormError message={error} />
        <FormCard>
          <FormPasswordInput
            label={STRINGS.profile.currentPassword}
            value={current}
            onChangeText={setCurrent}
            visible={showCurrent}
            onToggleVisible={() => setShowCurrent((s) => !s)}
            disabled={saving}
          />
          <FormPasswordInput
            label={STRINGS.auth.newPassword}
            value={next}
            onChangeText={setNext}
            visible={showNext}
            onToggleVisible={() => setShowNext((s) => !s)}
            disabled={saving}
          />
          <FormPasswordInput
            label={STRINGS.auth.confirmPassword}
            value={confirm}
            onChangeText={setConfirm}
            visible={showConfirm}
            onToggleVisible={() => setShowConfirm((s) => !s)}
            disabled={saving}
          />
          <FormPrimaryButton
            label={STRINGS.app.save}
            onPress={() => void handleSubmit()}
            loading={saving}
          />
        </FormCard>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: S[4],
  },
});
