import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenLayout } from '@/components/ScreenLayout';
import {
  FormError,
  FormPrimaryButton,
  FormTextArea,
  FormTextInput,
} from '@/components/ui/Form';
import { Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { employeeApi } from '@/lib/api';

const S = Spacing;

export default function NewMessageScreen() {
  const router = useRouter();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const s = subject.trim();
    const b = body.trim();
    if (!s || !b) {
      setError(STRINGS.messages.fillAll);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const created = await employeeApi.createConversation({
        subject: s,
        body: b,
      });
      router.replace(`/messages/${created.id}` as never);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : STRINGS.messages.sendError,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout title={STRINGS.messages.new} showBack showScroll>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.wrap}
      >
        <FormError message={error} />
        <FormTextInput
          label={STRINGS.messages.subject}
          value={subject}
          onChangeText={setSubject}
          placeholder={STRINGS.messages.subjectPlaceholder}
          maxLength={200}
          disabled={loading}
        />
        <FormTextArea
          label={STRINGS.messages.body}
          value={body}
          onChangeText={setBody}
          placeholder={STRINGS.messages.bodyPlaceholder}
          maxLength={4000}
          editable={!loading}
        />
        <FormPrimaryButton
          label={STRINGS.messages.send}
          onPress={() => void submit()}
          loading={loading}
        />
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: S[4],
  },
});
