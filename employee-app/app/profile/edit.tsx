import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenLayout } from '@/components/ScreenLayout';
import {
  FormCard,
  FormError,
  FormPrimaryButton,
  FormTextInput,
} from '@/components/ui/Form';
import { Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import { employeeApi } from '@/lib/api';
import { getMeCached, invalidateMeCache } from '@/lib/meCache';
import type { Profile } from '@/lib/types';

const S = Spacing;

export default function ProfileEditScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getMeCached();
        setProfile(data);
        setFirstName(data.firstName ?? '');
        setLastName(data.lastName ?? '');
        setPhone(data.phone ?? '');
        setLanguage(data.language ?? '');
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : STRINGS.profile.loadingError,
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError(STRINGS.errors.required);
      return;
    }
    setSaving(true);
    try {
      await employeeApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        language: language.trim() || undefined,
      });
      invalidateMeCache();
      router.back();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : STRINGS.errors.networkError,
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScreenLayout title={STRINGS.profile.edit} showBack showNotifications={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrap}
      >
        <FormError message={error} />
        <FormCard>
          <FormTextInput
            label={STRINGS.profile.firstName}
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            disabled={saving}
          />
          <FormTextInput
            label={STRINGS.profile.lastName}
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            disabled={saving}
          />
          <FormTextInput
            label={STRINGS.profile.phone}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            disabled={saving}
          />
          <FormTextInput
            label={STRINGS.profile.email}
            value={profile?.loginEmail ?? profile?.email ?? ''}
            editable={false}
            hint={
              profile?.loginEmail ? `Login: ${profile.loginEmail}` : undefined
            }
          />
          <FormTextInput
            label={STRINGS.profile.language}
            value={language}
            onChangeText={setLanguage}
            maxLength={5}
            autoCapitalize="none"
            placeholder="fr"
            disabled={saving}
          />
          <FormPrimaryButton
            label={STRINGS.app.save}
            onPress={() => void handleSave()}
            loading={saving}
          />
        </FormCard>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: S[4],
  },
  wrap: {
    paddingHorizontal: S[4],
  },
});
