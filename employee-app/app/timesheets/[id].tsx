import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Radius, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { ScreenLayout } from '@/components/ScreenLayout';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { useTheme } from '@/hooks/use-theme';
import { employeeApi } from '@/lib/api';
import type { TimesheetDayRow } from '@/lib/types';

const S = Spacing;

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

export default function TimesheetDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [row, setRow] = useState<TimesheetDayRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setRow(await employeeApi.getTimesheet(id));
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : STRINGS.errors.networkError);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenLayout
      title={STRINGS.timesheets.detailTitle}
      showBack
      onRefresh={() => void load()}
      contentStyle={styles.content}
    >
      {loading && !row ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : !row ? (
        <EmptyState icon="timer-outline" title={STRINGS.timesheets.empty} />
      ) : (
        <>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.surfaceCard, borderColor: theme.border },
            ]}
          >
            <View style={styles.headerRow}>
              <Text style={[styles.date, { color: theme.text }]}>
                {row.workDate}
              </Text>
              <StatusBadge
                label={statusLabel(row.status)}
                tone={statusTone(row.status)}
              />
            </View>
            <Metric
              label={STRINGS.timesheets.worked}
              value={formatHours(row.workedMinutes)}
              color={theme.text}
            />
            <Metric
              label={STRINGS.timesheets.break}
              value={formatHours(row.breakMinutes)}
              color={theme.textSecondary}
            />
            <Metric
              label={STRINGS.timesheets.late}
              value={`${row.lateMinutes} min`}
              color={theme.textSecondary}
            />
            <Metric
              label={STRINGS.timesheets.overtime}
              value={formatHours(row.overtimeMinutes)}
              color={theme.textSecondary}
            />
            {row.anomalyFlags?.length ? (
              <Text style={{ color: theme.warning, marginTop: S[3] }}>
                {row.anomalyFlags.join(' · ')}
              </Text>
            ) : null}
          </View>

          <Pressable
            onPress={() =>
              router.push({
                pathname: '/punch-claim-request',
                params: { workDate: row.workDate },
              } as never)
            }
            style={({ pressed }) => [
              styles.cta,
              { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.ctaText}>{STRINGS.timesheets.claimCta}</Text>
          </Pressable>
        </>
      )}
    </ScreenLayout>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={{ color, opacity: 0.7 }}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: S[4] },
  centered: { padding: S[8], alignItems: 'center' },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: S[5],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: S[3],
  },
  date: { fontSize: 18, fontWeight: '700' },
  metric: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: S[2],
  },
  metricValue: { fontWeight: '600' },
  cta: {
    marginTop: S[4],
    borderRadius: Radius.md,
    padding: S[4],
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '700' },
});
