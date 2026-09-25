import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { ScreenLayout } from '@/components/ScreenLayout';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { FilterChips } from '@/components/ui/FilterChips';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { useTheme } from '@/hooks/use-theme';
import { employeeApi } from '@/lib/api';
import type { TimesheetDayRow } from '@/lib/types';

const S = Spacing;

type RangeKey = '7' | '30' | '90';

const RANGE_OPTIONS: { key: RangeKey; label: string; days: number }[] = [
  { key: '7', label: STRINGS.timesheets.last7, days: 7 },
  { key: '30', label: STRINGS.timesheets.last30, days: 30 },
  { key: '90', label: STRINGS.timesheets.last90, days: 90 },
];

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m.toString().padStart(2, '0')}`;
}

function statusLabel(status: string): string {
  if (status === 'REVIEW_REQUIRED') return STRINGS.timesheets.statusReview;
  if (status === 'CLOSED') return STRINGS.timesheets.statusClosed;
  return STRINGS.timesheets.statusOpen;
}

function statusTone(status: string): StatusTone {
  if (status === 'REVIEW_REQUIRED') return 'warning';
  if (status === 'CLOSED') return 'success';
  return 'neutral';
}

function formatDay(iso: string): string {
  return new Date(`${iso}T12:00:00.000Z`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function TimesheetsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [range, setRange] = useState<RangeKey>('30');
  const [rows, setRows] = useState<TimesheetDayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rangeDays = useMemo(
    () => RANGE_OPTIONS.find((o) => o.key === range)?.days ?? 30,
    [range],
  );

  const load = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        const to = new Date();
        const from = new Date();
        from.setUTCDate(from.getUTCDate() - rangeDays);
        const res = await employeeApi.getTimesheets({
          page: 1,
          limit: 100,
          from: from.toISOString().slice(0, 10),
          to: to.toISOString().slice(0, 10),
        });
        setRows(res.data ?? []);
        setError(null);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : STRINGS.errors.networkError,
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [rangeDays],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const periodTotal = rows.reduce((s, r) => s + r.workedMinutes, 0);
  const showSpinner = loading && rows.length === 0;

  return (
    <ScreenLayout
      title={STRINGS.timesheets.title}
      showBack
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      contentStyle={styles.contentContainer}
    >
      <Text
        style={[styles.chipsLabel, { color: theme.textSecondary }]}
        accessibilityRole="header"
      >
        {STRINGS.timesheets.dateRange}
      </Text>
      <FilterChips
        options={RANGE_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
        value={range}
        onChange={setRange}
      />

      {showSpinner ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.muted, { color: theme.textSecondary }]}>
            {STRINGS.timesheets.loading}
          </Text>
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="timer-outline"
          title={STRINGS.timesheets.empty}
          hint={STRINGS.timesheets.emptyHint}
        />
      ) : (
        <View style={styles.list}>
          <View style={[styles.summary, { backgroundColor: theme.primary }]}>
            <Text style={styles.summaryLabel}>{STRINGS.timesheets.worked}</Text>
            <Text style={styles.summaryValue}>{formatHours(periodTotal)}</Text>
          </View>

          {rows.map((row) => (
            <Pressable
              key={row.id}
              onPress={() => router.push(`/timesheets/${row.id}` as never)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.row,
                {
                  backgroundColor: theme.surfaceCard,
                  borderColor: theme.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.day, { color: theme.text }]}>
                  {formatDay(row.workDate)}
                </Text>
                <Text style={{ color: theme.textSecondary, marginTop: 2 }}>
                  {formatHours(row.workedMinutes)}
                  {row.lateMinutes > 0
                    ? ` · ${STRINGS.timesheets.late} ${row.lateMinutes} min`
                    : ''}
                </Text>
              </View>
              <StatusBadge
                label={statusLabel(row.status)}
                tone={statusTone(row.status)}
              />
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.textMuted}
                style={{ marginLeft: S[2] }}
              />
            </Pressable>
          ))}
        </View>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contentContainer: { paddingTop: S[4], paddingBottom: S[6] },
  chipsLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: S[1],
    paddingHorizontal: S[4],
  },
  centered: { alignItems: 'center', padding: S[8] },
  muted: { marginTop: S[3], fontSize: 14 },
  list: { paddingHorizontal: S[4], marginTop: S[2] },
  summary: {
    borderRadius: Radius.lg,
    padding: S[5],
    marginBottom: S[3],
  },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  summaryValue: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MinTouchTarget,
    padding: S[4],
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: S[2],
  },
  day: { fontSize: 16, fontWeight: '600' },
});
