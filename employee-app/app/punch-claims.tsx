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
import type { PunchClaimRow } from '@/lib/types';

const S = Spacing;

function statusLabel(status: string): string {
  if (status === 'OPEN') return STRINGS.punchClaimsList.statusOpen;
  if (status === 'APPROVED') return STRINGS.punchClaimsList.statusApproved;
  if (status === 'REJECTED') return STRINGS.punchClaimsList.statusRejected;
  return status;
}

function statusTone(status: string): StatusTone {
  if (status === 'OPEN') return 'warning';
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  return 'neutral';
}

export default function PunchClaimsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [rows, setRows] = useState<PunchClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await employeeApi.getPunchClaims({ page: 1, limit: 50 });
      setRows(res.data ?? []);
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
      title={STRINGS.punchClaimsList.title}
      showBack
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      contentStyle={styles.content}
    >
      <Pressable
        onPress={() => router.push('/punch-claim-request' as never)}
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.ctaText}>{STRINGS.punchClaimsList.newCta}</Text>
      </Pressable>

      {showSpinner ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="flag-outline"
          title={STRINGS.punchClaimsList.empty}
          hint={STRINGS.punchClaimsList.emptyHint}
          actionLabel={STRINGS.punchClaimsList.newCta}
          onAction={() => router.push('/punch-claim-request' as never)}
        />
      ) : (
        rows.map((row) => (
          <View
            key={row.id}
            style={[
              styles.row,
              {
                backgroundColor: theme.surfaceCard,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>
                {row.workDate} · {row.type}
              </Text>
              <Text
                style={{ color: theme.textSecondary, marginTop: 2 }}
                numberOfLines={2}
              >
                {row.reason}
              </Text>
            </View>
            <StatusBadge
              label={statusLabel(row.status)}
              tone={statusTone(row.status)}
            />
          </View>
        ))
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { padding: S[4] },
  centered: { padding: S[8], alignItems: 'center' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: S[2],
    minHeight: MinTouchTarget,
    borderRadius: Radius.md,
    marginBottom: S[3],
  },
  ctaText: { color: '#fff', fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: S[4],
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: S[2],
    gap: S[2],
  },
  title: { fontWeight: '600' },
});
