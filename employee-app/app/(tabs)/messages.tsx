import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { ScreenLayout } from '@/components/ScreenLayout';
import { EmptyState, ErrorState } from '@/components/ui/EmptyState';
import { useTheme } from '@/hooks/use-theme';
import { employeeApi } from '@/lib/api';
import type { ConversationSummary } from '@/lib/types';

const S = Spacing;

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export default function MessagesTabScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [rows, setRows] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await employeeApi.getConversations({ page: 1, limit: 50 });
      setRows(res.data ?? []);
      setError(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : STRINGS.messages.loadError;
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    void load(true);
  }, []);

  useEffect(() => {
    void load();
  }, []);

  return (
    <ScreenLayout
      title={STRINGS.messages.title}
      showBack={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={
        <Pressable
          onPress={() => router.push('/messages/new' as never)}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.messages.new}
          hitSlop={8}
          style={styles.newBtn}
        >
          <Ionicons name="create-outline" size={22} color={theme.primary} />
        </Pressable>
      }
    >
      {error && !loading ? (
        <ErrorState
          message={error}
          onRetry={() => void load()}
          retryLabel={STRINGS.app.retry}
        />
      ) : null}

      {!error && !loading && rows.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title={STRINGS.messages.empty}
          hint={STRINGS.messages.emptyHint}
          actionLabel={STRINGS.messages.new}
          onAction={() => router.push('/messages/new' as never)}
        />
      ) : null}

      {rows.map((row) => (
        <Pressable
          key={row.id}
          onPress={() => router.push(`/messages/${row.id}` as never)}
          accessibilityRole="button"
          accessibilityLabel={row.subject}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: theme.surfaceCard,
              borderColor: theme.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View style={styles.rowTop}>
            <Text
              style={[
                styles.subject,
                {
                  color: theme.text,
                  fontWeight: row.unread ? '700' : '600',
                },
              ]}
              numberOfLines={1}
            >
              {row.subject}
            </Text>
            <Text style={[styles.when, { color: theme.textSecondary }]}>
              {formatWhen(row.lastMessageAt)}
            </Text>
          </View>
          <View style={styles.rowBottom}>
            <Text
              style={[styles.preview, { color: theme.textSecondary }]}
              numberOfLines={2}
            >
              {row.lastMessagePreview ?? '—'}
            </Text>
            {row.unread ? (
              <View
                style={[styles.dot, { backgroundColor: theme.primary }]}
                accessibilityLabel="Non lu"
              />
            ) : null}
          </View>
        </Pressable>
      ))}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  newBtn: {
    minWidth: MinTouchTarget,
    minHeight: MinTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    marginHorizontal: S.md,
    marginBottom: S.sm,
    padding: S.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
    marginBottom: 4,
  },
  subject: {
    flex: 1,
    fontSize: 16,
  },
  when: {
    fontSize: 12,
  },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
  },
  preview: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
