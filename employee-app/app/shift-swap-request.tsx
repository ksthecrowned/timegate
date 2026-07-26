import { useEffect, useMemo, useState } from 'react';
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

import { Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { DateField } from '@/components/ui/DateField';
import { useTheme } from '@/hooks/use-theme';
import { employeeApi } from '@/lib/api';
import { getMeCached } from '@/lib/meCache';
import type { Colleague, Profile } from '@/lib/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const S = Spacing;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(s: string): boolean {
  if (!DATE_REGEX.test(s)) return false;
  const d = new Date(s);
  return !Number.isNaN(d.getTime());
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

type ShiftOption = {
  id: string;
  date: string;
  shiftName: string | null;
  startTime?: string;
  endTime?: string;
};

export default function ShiftSwapRequestScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [shifts, setShifts] = useState<ShiftOption[]>([]);
  const [selectedShift, setSelectedShift] = useState<ShiftOption | null>(null);
  const [swapDate, setSwapDate] = useState('');
  const [search, setSearch] = useState('');
  const [colleagues, setColleagues] = useState<Colleague[]>([]);
  const [selectedColleague, setSelectedColleague] = useState<Colleague | null>(
    null,
  );
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load profile + upcoming shifts on mount.
  useEffect(() => {
    (async () => {
      try {
        const [me, upcoming] = await Promise.all([
          getMeCached(),
          employeeApi.getMyShifts({
            from: isoDay(new Date()),
            to: isoDay(addDays(new Date(), 14)),
          }),
        ]);
        setProfile(me);
        setShifts(
          (upcoming ?? []).map((a) => ({
            id: a.id,
            date: (a as any).date,
            shiftName: a.shiftName ?? null,
            startTime: (a as any).startTime,
            endTime: (a as any).endTime,
          })),
        );
      } catch (err: any) {
        setError(err?.message ?? STRINGS.errors.networkError);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Debounced search for colleagues.
  useEffect(() => {
    if (success) return;
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        const res = await employeeApi.getColleagues({
          search: search.trim() || undefined,
          limit: 20,
        });
        const list = (res.data ?? []).filter(
          (c) => c.id !== profile?.id,
        );
        if (!cancelled) setColleagues(list);
      } catch {
        // Silent — the search field just doesn't update.
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [search, profile?.id, success]);

  const validate = (): string | null => {
    if (!selectedShift) return STRINGS.swaps.fillAllFields;
    if (!selectedColleague) return STRINGS.swaps.fillAllFields;
    if (!swapDate) return STRINGS.leave.fillAllFields;
    if (!isValidDate(swapDate)) return STRINGS.leave.invalidDate;
    if (!reason.trim()) return STRINGS.swaps.fillAllFields;
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await employeeApi.createShiftSwap({
        shiftAssignmentId: selectedShift!.id,
        targetEmployeeId: selectedColleague!.id,
        swapDate,
        reason: reason.trim(),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? STRINGS.swaps.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  const onSelectShift = (s: ShiftOption) => {
    setSelectedShift(s);
    // Pre-fill swap date with the assignment's date.
    setSwapDate(s.date);
  };

  if (success) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.background },
        ]}
      >
        <View
          style={[
            styles.successCard,
            { backgroundColor: theme.surfaceCard },
          ]}
        >
          <View
            style={[
              styles.successIcon,
              { backgroundColor: theme.primary },
            ]}
          >
            <Ionicons name="checkmark" size={36} color="#fff" />
          </View>
          <Text style={[styles.successTitle, { color: theme.text }]}>
            {STRINGS.swaps.submitSuccess}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.successButton,
              {
                backgroundColor: theme.primary,
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
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + S[6] },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            {STRINGS.swaps.requestSwap}
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
            { backgroundColor: theme.surfaceCard },
          ]}
        >
          {/* Shift picker */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {STRINGS.swaps.chooseShift}
            </Text>
            {loading ? (
              <ActivityIndicator
                size="small"
                color={theme.primary}
                style={{ alignSelf: 'flex-start' }}
              />
            ) : shifts.length === 0 ? (
              <Text
                style={[styles.hint, { color: theme.textSecondary }]}
              >
                {STRINGS.swaps.noShifts}
              </Text>
            ) : (
              <View style={styles.optionsList}>
                {shifts.map((s) => {
                  const isSelected = selectedShift?.id === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => onSelectShift(s)}
                      style={({ pressed }) => [
                        styles.option,
                        {
                          backgroundColor: isSelected
                            ? theme.primary + '15'
                            : theme.background,
                          borderColor: isSelected
                            ? theme.primary
                            : theme.border,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          isSelected ? 'radio-button-on' : 'radio-button-off'
                        }
                        size={18}
                        color={
                          isSelected
                            ? theme.primary
                            : theme.textSecondary
                        }
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.optionTitle,
                            { color: theme.text },
                          ]}
                        >
                          {s.shiftName ?? 'Shift'}
                        </Text>
                        <Text
                          style={[
                            styles.optionMeta,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {new Date(s.date).toLocaleDateString('fr-FR', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                          })}
                          {s.startTime && s.endTime
                            ? ` · ${new Date(s.startTime).toLocaleTimeString(
                                'fr-FR',
                                { hour: '2-digit', minute: '2-digit' },
                              )} – ${new Date(s.endTime).toLocaleTimeString(
                                'fr-FR',
                                { hour: '2-digit', minute: '2-digit' },
                              )}`
                            : ''}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Colleague search + picker */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {STRINGS.swaps.chooseColleague}
            </Text>
            <View style={styles.searchRow}>
              <Ionicons
                name="search-outline"
                size={18}
                color={theme.textSecondary}
                style={styles.searchIcon}
              />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={STRINGS.swaps.searchColleague}
                placeholderTextColor={theme.textSecondary}
                style={[
                  styles.input,
                  styles.searchInput,
                  {
                    color: theme.text,
                    backgroundColor: theme.background,
                  },
                ]}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <View style={styles.optionsList}>
              {colleagues.length === 0 ? (
                <Text
                  style={[styles.hint, { color: theme.textSecondary }]}
                >
                  {search.trim()
                    ? STRINGS.app.noResults
                    : 'Tapez pour rechercher'}
                </Text>
              ) : (
                colleagues.map((c) => {
                  const isSelected = selectedColleague?.id === c.id;
                  const fullName = `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim();
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => setSelectedColleague(c)}
                      style={({ pressed }) => [
                        styles.option,
                        {
                          backgroundColor: isSelected
                            ? theme.primary + '15'
                            : theme.background,
                          borderColor: isSelected
                            ? theme.primary
                            : theme.border,
                          opacity: pressed ? 0.7 : 1,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          isSelected ? 'radio-button-on' : 'radio-button-off'
                        }
                        size={18}
                        color={
                          isSelected
                            ? theme.primary
                            : theme.textSecondary
                        }
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.optionTitle,
                            { color: theme.text },
                          ]}
                        >
                          {fullName || c.email || c.id}
                        </Text>
                        {(c.position || c.branchName) && (
                          <Text
                            style={[
                              styles.optionMeta,
                              { color: theme.textSecondary },
                            ]}
                          >
                            {[c.position, c.branchName].filter(Boolean).join(' · ')}
                          </Text>
                        )}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          </View>

          <DateField
            label={STRINGS.swaps.swapDate}
            value={swapDate}
            onChange={setSwapDate}
          />

          {/* Reason */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              {STRINGS.swaps.reason}
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder={STRINGS.swaps.reason}
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[
                styles.input,
                styles.textArea,
                {
                  color: theme.text,
                  backgroundColor: theme.background,
                },
              ]}
            />
          </View>

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.submitButton,
              {
                backgroundColor: theme.primary,
                opacity: pressed || submitting ? 0.7 : 1,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {STRINGS.swaps.submit}
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
  hint: { fontSize: 13, fontStyle: 'italic' },
  optionsList: {
    gap: S[2],
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S[3],
    padding: S[3],
    borderRadius: S[2],
    borderWidth: 1,
  },
  optionTitle: { fontSize: 14, fontWeight: '600' },
  optionMeta: { fontSize: 12, marginTop: 2 },
  searchRow: { position: 'relative', marginBottom: S[2] },
  searchInput: { paddingLeft: 40 },
  searchIcon: {
    position: 'absolute',
    left: S[3],
    top: 0,
    bottom: 0,
    zIndex: 1,
    pointerEvents: 'none',
    textAlignVertical: 'center',
    lineHeight: 50,
  },
  dateField: { position: 'relative', justifyContent: 'center' },
  dateInput: { paddingRight: 40 },
  dateIcon: {
    position: 'absolute',
    right: S[3],
    pointerEvents: 'none',
  },
  textArea: { minHeight: 100, paddingTop: S[3] },
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