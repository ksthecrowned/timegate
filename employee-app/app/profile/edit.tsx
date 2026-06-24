import { useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';

import { BottomTabInset, Spacing } from '@/constants/theme';
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
      } catch (err: any) {
        setError(err?.message ?? STRINGS.profile.loadingError);
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
    } catch (err: any) {
      setError(err?.message ?? STRINGS.errors.networkError);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.tint} />
      </View>
    );
  }

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
            {STRINGS.profile.edit}
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
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {STRINGS.profile.firstName}
            </Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.background },
              ]}
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {STRINGS.profile.lastName}
            </Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.background },
              ]}
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {STRINGS.profile.phone}
            </Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.background },
              ]}
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {STRINGS.profile.email}
            </Text>
            <TextInput
              value={profile?.loginEmail ?? profile?.email ?? ''}
              editable={false}
              style={[
                styles.input,
                styles.inputDisabled,
                { color: theme.textSecondary, backgroundColor: theme.background },
              ]}
            />
            <Text style={[styles.hint, { color: theme.textSecondary }]}>
              {profile?.loginEmail
                ? `Login: ${profile.loginEmail}`
                : ''}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {STRINGS.profile.language}
            </Text>
            <TextInput
              value={language}
              onChangeText={setLanguage}
              maxLength={5}
              autoCapitalize="none"
              style={[
                styles.input,
                { color: theme.text, backgroundColor: theme.background },
              ]}
              placeholderTextColor={theme.textSecondary}
              placeholder="fr"
            />
          </View>

          <Pressable
            onPress={handleSave}
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

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: S[4],
  },
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
  input: {
    borderRadius: S[2],
    paddingHorizontal: S[3],
    paddingVertical: S[3],
    fontSize: 16,
  },
  inputDisabled: { opacity: 0.6 },
  hint: { fontSize: 12, marginTop: 4 },
  submitButton: {
    paddingVertical: S[3],
    borderRadius: S[2],
    alignItems: 'center',
    marginTop: S[2],
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});