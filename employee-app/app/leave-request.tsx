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
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { BottomTabInset, Colors, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { employeeApi } from '@/lib/api';
import type { LeaveType } from '@/lib/types';

const S = Spacing;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s: string): boolean {
  if (!DATE_REGEX.test(s)) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

function todayIso(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function LeaveRequestScreen() {
  const router = useRouter();
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [selectedLeaveType, setSelectedLeaveType] = useState<string | null>(
    null,
  );
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await employeeApi.getLeaveTypes();
        setLeaveTypes(data.data ?? []);
      } catch (err) {
        // Leave types are optional context — surface only the submit error.
        console.warn('Failed to load leave types', err);
      }
    })();
  }, []);

  const validate = (): string | null => {
    if (!selectedLeaveType) return STRINGS.leave.fillAllFields;
    if (!startDate || !endDate) return STRINGS.leave.fillAllFields;
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return STRINGS.leave.invalidDate;
    }
    if (new Date(endDate) < new Date(startDate)) {
      return STRINGS.leave.endDateBeforeStart;
    }
    if (new Date(startDate) < new Date(todayIso())) {
      // Soft warning — we don't block past dates here, the backend may reject.
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await employeeApi.createLeave({
        startDate,
        endDate,
        leaveTypeId: selectedLeaveType!,
        reason: reason.trim() || undefined,
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? STRINGS.leave.submitError);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: Colors.light.background },
        ]}
      >
        <View
          style={[
            styles.successCard,
            { backgroundColor: Colors.light.surfaceCard },
          ]}
        >
          <View
            style={[
              styles.successIcon,
              { backgroundColor: Colors.light.primary },
            ]}
          >
            <Ionicons name="checkmark" size={36} color="#fff" />
          </View>
          <Text style={[styles.successTitle, { color: Colors.light.text }]}>
            {STRINGS.leave.submitSuccess}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.successButton,
              {
                backgroundColor: Colors.light.primary,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={styles.successButtonText}>{STRINGS.app.confirm}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: Colors.light.background }]}
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
          <Text style={[styles.title, { color: Colors.light.text }]}>
            {STRINGS.leave.requestLeave}
          </Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View
          style={[
            styles.formCard,
            { backgroundColor: Colors.light.surfaceCard },
          ]}
        >
          {/* Leave type selector */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: Colors.light.textSecondary }]}>
              {STRINGS.leave.leaveType}
            </Text>
            {leaveTypes.length === 0 ? (
              <Text style={[styles.hint, { color: Colors.light.textSecondary }]}>
                {STRINGS.app.loading}
              </Text>
            ) : (
              <View style={styles.typeGrid}>
                {leaveTypes.map((lt) => {
                  const isSelected = selectedLeaveType === lt.id;
                  return (
                    <Pressable
                      key={lt.id}
                      onPress={() => setSelectedLeaveType(lt.id)}
                      style={({ pressed }) => [
                        styles.typeChip,
                        {
                          backgroundColor: isSelected
                            ? Colors.light.primary
                            : Colors.light.background,
                          borderColor: isSelected
                            ? Colors.light.primary
                            : Colors.light.border,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          {
                            color: isSelected
                              ? '#fff'
                              : Colors.light.text,
                          },
                        ]}
                      >
                        {lt.name}
                      </Text>
                      {lt.maxDaysPerYear != null && (
                        <Text
                          style={[
                            styles.typeChipMeta,
                            {
                              color: isSelected
                                ? 'rgba(255,255,255,0.85)'
                                : Colors.light.textSecondary,
                            },
                          ]}
                        >
                          {lt.maxDaysPerYear} j
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.dateRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text
                style={[styles.label, { color: Colors.light.textSecondary }]}
              >
                {STRINGS.leave.startDate}
              </Text>
              <View style={styles.dateField}>
                <TextInput
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor={Colors.light.textSecondary}
                  value={startDate}
                  onChangeText={setStartDate}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[
                    styles.input,
                    styles.dateInput,
                    {
                      color: Colors.light.text,
                      backgroundColor: Colors.light.background,
                    },
                  ]}
                />
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={Colors.light.textSecondary}
                  style={styles.dateIcon}
                />
              </View>
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text
                style={[styles.label, { color: Colors.light.textSecondary }]}
              >
                {STRINGS.leave.endDate}
              </Text>
              <View style={styles.dateField}>
                <TextInput
                  placeholder="AAAA-MM-JJ"
                  placeholderTextColor={Colors.light.textSecondary}
                  value={endDate}
                  onChangeText={setEndDate}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[
                    styles.input,
                    styles.dateInput,
                    {
                      color: Colors.light.text,
                      backgroundColor: Colors.light.background,
                    },
                  ]}
                />
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={Colors.light.textSecondary}
                  style={styles.dateIcon}
                />
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: Colors.light.textSecondary }]}>
              {STRINGS.leave.reasonOptional}
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={STRINGS.leave.reason}
              placeholderTextColor={Colors.light.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[
                styles.input,
                styles.textArea,
                {
                  color: Colors.light.text,
                  backgroundColor: Colors.light.background,
                },
              ]}
            />
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={loading}
            style={({ pressed }) => [
              styles.submitButton,
              {
                backgroundColor: Colors.light.primary,
                opacity: pressed || loading ? 0.7 : 1,
              },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {STRINGS.leave.submit}
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
  centered: { alignItems: 'center', justifyContent: 'center', padding: S[4] },
  scroll: { flex: 1 },
  contentContainer: {
    paddingHorizontal: S[4],
    paddingTop: S[4],
    alignItems: 'stretch',
    flexGrow: 1,
  },
  header: { marginBottom: S[4] },
  title: { fontSize: 24, fontWeight: '700' },
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
  dateRow: { flexDirection: 'row', gap: S[3] },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: S[2],
    textTransform: 'uppercase',
  },
  input: {
    borderRadius: S[2],
    paddingHorizontal: S[3],
    paddingVertical: S[3],
    fontSize: 16,
  },
  dateField: { position: 'relative', justifyContent: 'center' },
  dateInput: { paddingRight: 40 },
  dateIcon: {
    position: 'absolute',
    right: S[3],
    pointerEvents: 'none',
  },
  textArea: { minHeight: 100, paddingTop: S[3] },
  hint: { fontSize: 14 },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: S[2],
  },
  typeChip: {
    paddingHorizontal: S[3],
    paddingVertical: S[2],
    borderRadius: S[2],
    borderWidth: 1,
  },
  typeChipText: { fontSize: 14, fontWeight: '600' },
  typeChipMeta: { fontSize: 11, marginTop: 2 },
  submitButton: {
    paddingVertical: S[3],
    borderRadius: S[2],
    alignItems: 'center',
    marginTop: S[2],
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  successCard: {
    borderRadius: S[4],
    padding: S[6],
    alignItems: 'center',
    width: '100%',
  },
  successIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: S[3],
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: S[4],
    textAlign: 'center',
  },
  successButton: {
    paddingHorizontal: S[5],
    paddingVertical: S[3],
    borderRadius: S[2],
  },
  successButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});