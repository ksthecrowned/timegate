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
import { useTheme } from '@/hooks/use-theme';
import { employeeApi } from '@/lib/api';
import type { PendingHrItem } from '@/lib/types';

const S = Spacing;

export default function PendingHrScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [rows, setRows] = useState<PendingHrItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await employeeApi.getPendingHr();
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
      title={STRINGS.pendingHr.title}
      subtitle={STRINGS.pendingHr.subtitle}
      showBack
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      contentStyle={styles.content}
    >
      {showSpinner ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="checkmark-circle-outline"
          title={STRINGS.pendingHr.empty}
          hint={STRINGS.pendingHr.emptyHint}
        />
      ) : (
        rows.map((row) => (
          <Pressable
            key={`${row.kind}:${row.id}`}
            onPress={() => router.push(row.href as never)}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: theme.surfaceCard,
                borderColor: theme.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <View
              style={[styles.icon, { backgroundColor: theme.warningSoft }]}
            >
              <Ionicons
                name="hourglass-outline"
                size={18}
                color={theme.warning}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>
                {row.title}
              </Text>
              <Text
                style={{ color: theme.textSecondary, marginTop: 2 }}
                numberOfLines={2}
              >
                {row.workDate} · {row.subtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </Pressable>
        ))
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { padding: S[4] },
  centered: { padding: S[8], alignItems: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: MinTouchTarget,
    padding: S[4],
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: S[2],
    gap: S[3],
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontWeight: '600' },
});
