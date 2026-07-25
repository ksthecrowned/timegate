import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { ScreenLayout } from '@/components/ScreenLayout';
import { useTheme } from '@/hooks/use-theme';
import { employeeApi } from '@/lib/api';
import type { LeaveBalance } from '@/lib/types';

const S = Spacing;

export default function LeaveBalancesScreen() {
  const theme = useTheme();
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBalances = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const currentYear = new Date().getFullYear();
      const res = await employeeApi.getLeaveBalances({ year: currentYear });
      setBalances(res.balances ?? []);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? STRINGS.errors.networkError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    loadBalances(true);
  }, []);

  useEffect(() => {
    loadBalances();
  }, []);

  const showSpinner = loading && balances.length === 0;

  const totalAllocated = balances.reduce(
    (s, b) => s + (b.allocated ?? 0),
    0,
  );
  const totalUsed = balances.reduce((s, b) => s + (b.used ?? 0), 0);
  const totalRemaining = Math.max(0, totalAllocated - totalUsed);

  return (
    <ScreenLayout
      title={STRINGS.leaveBalances.title}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {showSpinner ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.muted, { color: theme.textSecondary }]}>
              {STRINGS.leaveBalances.loading}
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : balances.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.surfaceCard },
            ]}
          >
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {STRINGS.leaveBalances.noData}
            </Text>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: theme.primary },
              ]}
            >
              <Text style={styles.summaryLabel}>
                {STRINGS.leaveBalances.summary}
              </Text>
              <Text style={styles.summaryValue}>
                {totalRemaining}
                <Text style={styles.summaryUnit}> j</Text>
              </Text>
              <View style={styles.summaryFooter}>
                <Text style={styles.summaryFooterItem}>
                  {STRINGS.leaveBalances.used} : {totalUsed}
                </Text>
                <Text style={styles.summaryFooterItem}>
                  {STRINGS.leaveBalances.allocated} : {totalAllocated}
                </Text>
              </View>
            </View>

            {balances.map((b, idx) => {
              const allocated = b.unlimited ? Infinity : b.allocated ?? 0;
              const used = b.used ?? 0;
              const remaining = b.unlimited ? Infinity : b.remaining ?? 0;
              const usagePercent =
                !b.unlimited && allocated > 0
                  ? Math.min(100, (used / allocated) * 100)
                  : 0;
              return (
                <View
                  key={`${b.leaveTypeId}-${idx}`}
                  style={[
                    styles.card,
                    { backgroundColor: theme.surfaceCard },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <Text style={[styles.cardTitle, { color: theme.text }]}>
                      {b.leaveTypeName}
                    </Text>
                    <Text style={[styles.remaining, { color: theme.primary }]}>
                      {b.unlimited ? '∞' : remaining}
                      {!b.unlimited && (
                        <Text
                          style={[
                            styles.remainingUnit,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {' '}/ {allocated}
                        </Text>
                      )}
                    </Text>
                  </View>

                  {!b.unlimited && (
                    <View
                      style={[
                        styles.progressTrack,
                        { backgroundColor: theme.surfaceMuted },
                      ]}
                    >
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${usagePercent}%`,
                            backgroundColor:
                              usagePercent >= 90
                                ? '#E74C3C'
                                : usagePercent >= 60
                                  ? '#F39C12'
                                  : '#2ECC71',
                          },
                        ]}
                      />
                    </View>
                  )}

                  <View style={styles.statsRow}>
                    <Stat
                      label={STRINGS.leaveBalances.allocated}
                      value={b.unlimited ? '∞' : allocated}
                      color={theme.text}
                    />
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: theme.border },
                      ]}
                    />
                    <Stat
                      label={STRINGS.leaveBalances.used}
                      value={used}
                      color="#F39C12"
                    />
                    <View
                      style={[
                        styles.divider,
                        { backgroundColor: theme.border },
                      ]}
                    />
                    <Stat
                      label={STRINGS.leaveBalances.remaining}
                      value={b.unlimited ? '∞' : remaining}
                      color="#2ECC71"
                    />
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.statBlock}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: S[4],
    paddingTop: S[6],
    paddingBottom: S[6],
    alignItems: 'stretch',
    flexGrow: 1,
  },
  centered: { alignItems: 'center', padding: S[8] },
  muted: { fontSize: 14, marginTop: S[3] },
  errorBox: {
    backgroundColor: '#FADBD8',
    borderRadius: S[2],
    padding: S[3],
    margin: S[4],
  },
  errorText: { color: '#C0392B', fontSize: 14, textAlign: 'center' },
  emptyCard: {
    borderRadius: S[4],
    padding: S[6],
    alignItems: 'center',
    marginTop: S[4],
  },
  emptyText: { fontSize: 16, textAlign: 'center' },
  summaryCard: {
    borderRadius: S[4],
    padding: S[5],
    marginBottom: S[4],
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 44,
    fontWeight: '800',
    marginTop: S[2],
  },
  summaryUnit: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.85)',
  },
  summaryFooter: {
    flexDirection: 'row',
    gap: S[3],
    marginTop: S[3],
  },
  summaryFooterItem: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '500',
  },
  card: {
    borderRadius: S[4],
    padding: S[4],
    marginBottom: S[3],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: S[3],
  },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  remaining: { fontSize: 20, fontWeight: '700' },
  remainingUnit: { fontSize: 13, fontWeight: '500' },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: S[3],
  },
  progressFill: { height: '100%', borderRadius: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: { width: 1, height: 30, opacity: 0.4 },
});