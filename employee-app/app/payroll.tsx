import { useCallback, useEffect, useState } from 'react';
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
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { useTheme } from '@/hooks/use-theme';
import { employeeApi } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { getMeCached } from '@/lib/meCache';
import type { PayrollLineSummary } from '@/lib/types';

const S = Spacing;

function runTone(status: string): StatusTone {
  if (status === 'PAID') return 'success';
  if (status === 'PARTIALLY_PAID') return 'warning';
  return 'neutral';
}

function runLabel(status: string): string {
  if (status === 'PAID') return STRINGS.payroll.statusPaid;
  if (status === 'PARTIALLY_PAID') return STRINGS.payroll.statusPartial;
  return STRINGS.payroll.statusLocked;
}

export default function PayrollScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [rows, setRows] = useState<PayrollLineSummary[]>([]);
  const [currency, setCurrency] = useState('XAF');
  const [disclaimer, setDisclaimer] = useState(STRINGS.payroll.disclaimer);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const [res, me] = await Promise.all([
        employeeApi.getPayrollSummary({ page: 1, limit: 24 }),
        getMeCached().catch(() => null),
      ]);
      setRows(res.data ?? []);
      if (res.disclaimer) setDisclaimer(res.disclaimer);
      if (me?.currencyCode) setCurrency(me.currencyCode);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : STRINGS.errors.networkError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const showSpinner = loading && rows.length === 0;

  return (
    <ScreenLayout
      title={STRINGS.payroll.title}
      showBack
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      contentStyle={styles.content}
    >
      <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
        {disclaimer}
      </Text>

      {showSpinner ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="wallet-outline"
          title={STRINGS.payroll.empty}
          hint={STRINGS.payroll.emptyHint}
        />
      ) : (
        rows.map((row) => (
          <Pressable
            key={row.id}
            onPress={() => router.push(`/payroll/${row.id}` as never)}
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
              <Text style={[styles.month, { color: theme.text }]}>
                {STRINGS.payroll.monthLabel(row.year, row.month)}
              </Text>
              <Text style={{ color: theme.textSecondary, marginTop: 2 }}>
                {STRINGS.payroll.net} · {formatMoney(row.net, currency)}
              </Text>
            </View>
            <StatusBadge
              label={runLabel(row.runStatus)}
              tone={runTone(row.runStatus)}
            />
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.textMuted}
              style={{ marginLeft: S[2] }}
            />
          </Pressable>
        ))
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { padding: S[4] },
  centered: { padding: S[8], alignItems: 'center' },
  disclaimer: {
    fontSize: 13,
    marginBottom: S[3],
    lineHeight: 18,
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
  month: { fontSize: 16, fontWeight: '600', textTransform: 'capitalize' },
});
