import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { ScreenLayout } from '@/components/ScreenLayout';
import { FilterChips } from '@/components/ui/FilterChips';
import { employeeApi } from '@/lib/api';
import { resolveNotificationHref } from '@/lib/notificationDeepLink';
import { useRouter } from 'expo-router';

type FilterType = 'all' | 'unread';

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  meta?: Record<string, unknown> | null;
};

const typeIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  PUNCH_CHECK_IN: 'log-in-outline',
  PUNCH_CHECK_OUT: 'log-out-outline',
  PUNCH_BREAK: 'cafe-outline',
  PUNCH_REVIEW_REQUIRED: 'alert-circle-outline',
  PUNCH_OUTSIDE_WINDOW: 'warning-outline',
  PUNCH_LATE: 'time-outline',
  ABSENCE_AUTO: 'calendar-outline',
  UNCLOSED_CHECK_IN: 'exit-outline',
  UNCLOSED_CHECK_IN_REMINDER: 'notifications-outline',
  BREAK_RESUME_REMINDER: 'cafe-outline',
  BREAK_OVERRUN: 'warning-outline',
  KIOSK_OFFLINE: 'cloud-offline-outline',
  VERIFY_FAILURE_SPIKE: 'warning-outline',
  OVERTIME_THRESHOLD: 'time-outline',
  LEAVE_REQUEST_PENDING: 'calendar-outline',
  LEAVE_APPROVED: 'checkmark-circle-outline',
  LEAVE_REJECTED: 'close-circle-outline',
  LEAVE_BALANCE_LOW: 'alert-circle-outline',
  HR_CONTRACT_EXPIRING: 'document-text-outline',
  HR_DOCUMENT_MISSING: 'document-attach-outline',
  SUBSCRIPTION_TRIAL_REMINDER: 'card-outline',
  SUBSCRIPTION_EXPIRING: 'card-outline',
  SUBSCRIPTION_GRACE: 'warning-outline',
  SUBSCRIPTION_BLOCKED: 'lock-closed-outline',
  SUBSCRIPTION_QUOTA_WARNING: 'pie-chart-outline',
  SUBSCRIPTION_QUOTA_REACHED: 'alert-outline',
};

function iconForType(type: string): keyof typeof Ionicons.glyphMap {
  return typeIcons[type] ?? 'notifications-outline';
}

const formatDay = (d: Date) =>
  d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

const relativeTime = (dateStr: string) => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);
  if (diffMin < 1) return STRINGS.notifications.justNow;
  if (diffMin < 60) return STRINGS.notifications.minutesAgo(diffMin);
  if (diffH < 24) return STRINGS.notifications.hoursAgo(diffH);
  if (diffD < 7) return STRINGS.notifications.daysAgo(diffD);
  return formatDay(date);
};

export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [items, setItems] = useState<NotificationRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await employeeApi.getNotifications({
        page: 1,
        limit: 30,
        ...(filter === 'unread' ? { unreadOnly: true } : {}),
      });
      setItems(res.data ?? []);
      setError(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de chargement';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(() => {
    void load(true);
  }, [load]);

  const unreadCount = items.filter((i) => !i.readAt).length;

  const markAllAsRead = async () => {
    try {
      await employeeApi.markAllNotificationsRead();
      setItems((prev) =>
        prev.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })),
      );
    } catch {
      // ignore
    }
  };

  const markRead = async (item: NotificationRow) => {
    if (item.readAt) return;
    try {
      await employeeApi.markNotificationRead(item.id);
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, readAt: new Date().toISOString() } : i,
        ),
      );
    } catch {
      // ignore
    }
  };

  const openNotification = async (item: NotificationRow) => {
    await markRead(item);
    const href = resolveNotificationHref({ type: item.type, meta: item.meta });
    router.push(href as never);
  };

  return (
    <ScreenLayout
      title={STRINGS.notifications.title}
      subtitle={STRINGS.notifications.activitySubtitle}
      showBack
      showNotifications={false}
      showScroll={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={
        unreadCount > 0 ? (
          <Pressable
            onPress={() => void markAllAsRead()}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.notifications.markAll}
            hitSlop={8}
            style={{
              minHeight: 44,
              paddingHorizontal: Spacing[3],
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: colors.primary + '20',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: colors.primary,
              }}
            >
              {STRINGS.notifications.markAll}
            </Text>
          </Pressable>
        ) : null
      }
    >
      <FilterChips
        options={[
          { value: 'all' as FilterType, label: STRINGS.notifications.all },
          { value: 'unread' as FilterType, label: STRINGS.notifications.unread },
        ]}
        value={filter}
        onChange={setFilter}
      />

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Spacing[4] }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            accessibilityLabel="Actualiser"
          />
        }
      >
        {loading && items.length === 0 ? (
          <View style={{ padding: Spacing[8], alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : error ? (
          <View
            style={{
              margin: Spacing[4],
              padding: Spacing[5],
              backgroundColor: '#E74C3C15',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#E74C3C40',
            }}
          >
            <Text style={{ color: '#E74C3C', fontSize: 14 }}>{error}</Text>
          </View>
        ) : items.length === 0 ? (
          <View
            style={{
              margin: Spacing[4],
              padding: Spacing[8],
              backgroundColor: colors.surfaceCard,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
            }}
          >
            <Ionicons
              name="checkmark-done-circle-outline"
              size={48}
              color={colors.textMuted}
            />
            <Text
              style={{
                fontSize: 15,
                color: colors.textSecondary,
                marginTop: 12,
                textAlign: 'center',
              }}
            >
              {filter === 'unread'
                ? STRINGS.notifications.noUnread
                : STRINGS.notifications.noNotifications}
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: Spacing[4] }}>
            {items.map((item) => {
              const isUnread = !item.readAt;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => void openNotification(item)}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.title}. ${item.body}. ${relativeTime(item.createdAt)}${isUnread ? ', non lue' : ''}`}
                  accessibilityHint="Ouvre l’écran concerné"
                  accessibilityState={{ selected: isUnread }}
                  style={{
                    flexDirection: 'row',
                    minHeight: 44,
                    padding: Spacing[4],
                    backgroundColor: isUnread
                      ? colors.primary + '08'
                      : colors.surfaceCard,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: isUnread
                      ? colors.primary + '30'
                      : colors.border,
                    marginBottom: Spacing[3],
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: colors.primary + '15',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: Spacing[3],
                    }}
                    importantForAccessibility="no"
                  >
                    <Ionicons
                      name={iconForType(item.type)}
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: isUnread ? '700' : '500',
                          color: colors.text,
                          flex: 1,
                          marginRight: 8,
                        }}
                      >
                        {item.title}
                      </Text>
                      {isUnread ? (
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: colors.primary,
                            marginTop: 6,
                          }}
                          accessibilityElementsHidden
                          importantForAccessibility="no-hide-descendants"
                        />
                      ) : null}
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textSecondary,
                        marginTop: 2,
                        lineHeight: 17,
                      }}
                    >
                      {item.body}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: colors.textMuted,
                        marginTop: 4,
                        fontWeight: '500',
                      }}
                    >
                      {relativeTime(item.createdAt)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}
