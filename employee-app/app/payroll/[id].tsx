import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { Radius, Spacing } from '@/constants/theme';
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

export default function PayrollDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [row, setRow] = useState<PayrollLineSummary | null>(null);
  const [currency, setCurrency] = useState('XAF');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [line, me] = await Promise.all([
        employeeApi.getPayrollLine(id),
        getMeCached().catch(() => null),
      ]);
      setRow(line);
      if (me?.currencyCode) setCurrency(me.currencyCode);
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
      title={STRINGS.payroll.title}
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
        <EmptyState icon="wallet-outline" title={STRINGS.payroll.empty} />
      ) : (
        <>
          <View style={[styles.hero, { backgroundColor: theme.primary }]}>
            <Text style={styles.heroMonth}>
              {STRINGS.payroll.monthLabel(row.year, row.month)}
            </Text>
            <Text style={styles.heroNet}>{formatMoney(row.net, currency)}</Text>
            <Text style={styles.heroHint}>{STRINGS.payroll.net}</Text>
            <View style={{ marginTop: S[2] }}>
              <StatusBadge
                label={runLabel(row.runStatus)}
                tone={runTone(row.runStatus)}
              />
            </View>
          </View>

          <View
            style={[
              styles.card,
              { backgroundColor: theme.surfaceCard, borderColor: theme.border },
            ]}
          >
            <Line
              label={STRINGS.payroll.base}
              value={formatMoney(row.baseSalary, currency)}
              color={theme.text}
            />
            <Line
              label={STRINGS.payroll.allowances}
              value={formatMoney(row.allowances, currency)}
              color={theme.text}
            />
            <Line
              label={STRINGS.payroll.deductions}
              value={formatMoney(row.deductions, currency)}
              color={theme.text}
            />
            <Line
              label={STRINGS.payroll.gross}
              value={formatMoney(row.gross, currency)}
              color={theme.text}
            />
            <Line
              label={STRINGS.payroll.net}
              value={formatMoney(row.net, currency)}
              color={theme.text}
              bold
            />
          </View>

          <Text style={[styles.disclaimer, { color: theme.textSecondary }]}>
            {row.disclaimer ?? STRINGS.payroll.disclaimer}
          </Text>
        </>
      )}
    </ScreenLayout>
  );
}

function Line({
  label,
  value,
  color,
  bold,
}: {
  label: string;
  value: string;
  color: string;
  bold?: boolean;
}) {
  return (
    <View style={styles.line}>
      <Text style={{ color, fontWeight: bold ? '700' : '400' }}>{label}</Text>
      <Text style={{ color, fontWeight: bold ? '700' : '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: S[4] },
  centered: { padding: S[8], alignItems: 'center' },
  hero: {
    borderRadius: Radius.lg,
    padding: S[5],
    marginBottom: S[3],
  },
  heroMonth: {
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'capitalize',
  },
  heroNet: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 4,
  },
  heroHint: { color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: S[5],
  },
  line: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: S[2],
  },
  disclaimer: {
    marginTop: S[3],
    fontSize: 13,
    lineHeight: 18,
  },
});
