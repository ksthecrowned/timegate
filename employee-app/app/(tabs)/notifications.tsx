import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { ScreenLayout } from '@/components/ScreenLayout';
import { employeeApi } from '@/lib/api';
import type {
  LeaveApplication,
  ShiftSwapRequest,
} from '@/lib/types';

type ActivityType = 'leave' | 'swap';

type ActivityItem = {
  id: string;
  type: ActivityType;
  title: string;
  message: string;
  date: string;
  read: boolean;
  status?: string;
};

const typeColors: Record<ActivityType, { bg: string; text: string }> = {
  leave: { bg: '#0d948820', text: '#0d9488' },
  swap: { bg: '#9B59B620', text: '#9B59B6' },
};

const typeIcons: Record<ActivityType, keyof typeof Ionicons.glyphMap> = {
  leave: 'calendar-outline',
  swap: 'swap-horizontal-outline',
};

type FilterType = 'all' | 'unread';

const statusLabel = (s?: string) => {
  switch (s) {
    case 'approved':
      return STRINGS.leave.approved;
    case 'rejected':
      return STRINGS.leave.rejected;
    case 'pending':
      return STRINGS.leave.pending;
    default:
      return s || '';
  }
};

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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [items, setItems] = useState<ActivityItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');

  const buildActivity = async (): Promise<ActivityItem[]> => {
    const results: ActivityItem[] = [];

    try {
      const leaves = await employeeApi.getLeaves({ limit: 20 });
      (leaves.data ?? []).forEach((leave: LeaveApplication) => {
        const status = leave.status ?? 'pending';
        results.push({
          id: `leave-${leave.id}`,
          type: 'leave',
          title: `Demande de congé ${statusLabel(status).toLowerCase()}`,
          message: `${leave.leaveType?.name ?? 'Congé'} du ${formatDay(new Date(leave.startDate))} au ${formatDay(new Date(leave.endDate))}`,
          date: leave.startDate,
          read: status !== 'pending',
          status,
        });
      });
    } catch {
      // ignore
    }

    try {
      const swaps = await employeeApi.getShiftSwaps({ limit: 20 });
      (swaps.data ?? []).forEach((swap: ShiftSwapRequest) => {
        const status = swap.status ?? 'pending';
        const targetName = swap.target
          ? `${swap.target.firstName ?? ''} ${swap.target.lastName ?? ''}`.trim()
          : 'un collègue';
        results.push({
          id: `swap-${swap.id}`,
          type: 'swap',
          title: `Échange de shift ${statusLabel(status).toLowerCase()}`,
          message: `Avec ${targetName} le ${formatDay(new Date(swap.swapDate))}`,
          date: swap.swapDate,
          read: status !== 'pending',
          status,
        });
      });
    } catch {
      // ignore
    }

    return results.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  };

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const data = await buildActivity();
      setItems(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? 'Erreur de chargement');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    load(true);
  }, []);

  useEffect(() => {
    load();
  }, []);

  const markAllAsRead = () => {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
  };

  const filtered = filter === 'unread' ? items.filter((i) => !i.read) : items;
  const unreadCount = items.filter((i) => !i.read).length;

  return (
    <ScreenLayout
      title={STRINGS.tabs.activity}
      refreshing={refreshing}
      onRefresh={onRefresh}
      rightAction={
        unreadCount > 0 ? (
          <Pressable
            onPress={markAllAsRead}
            style={{
              paddingHorizontal: Spacing[3],
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: colors.primary + '20',
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
      {/* Filter chips */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: Spacing[4],
          gap: Spacing[2],
          marginBottom: Spacing[3],
        }}
      >
        {(['all', 'unread'] as FilterType[]).map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={{
                paddingHorizontal: Spacing[4],
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: active ? colors.primary : colors.surfaceCard,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: active ? '#ffffff' : colors.text,
                }}
              >
                {f === 'all'
                  ? STRINGS.notifications.all
                  : STRINGS.notifications.unread}
              </Text>
            </Pressable>
          );
        })}
      </View>

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
      ) : filtered.length === 0 ? (
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
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: Spacing[6] }}
        >
          <View style={{ paddingHorizontal: Spacing[4] }}>
            {filtered.map((item) => {
              const tc = typeColors[item.type];
              return (
                <View
                  key={item.id}
                  style={{
                    flexDirection: 'row',
                    padding: Spacing[4],
                    backgroundColor: item.read
                      ? colors.surfaceCard
                      : colors.primary + '08',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: item.read
                      ? colors.border
                      : colors.primary + '30',
                    marginBottom: Spacing[3],
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: tc.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: Spacing[3],
                    }}
                  >
                    <Ionicons
                      name={typeIcons[item.type]}
                      size={20}
                      color={tc.text}
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
                          fontWeight: item.read ? '500' : '700',
                          color: colors.text,
                          flex: 1,
                          marginRight: 8,
                        }}
                      >
                        {item.title}
                      </Text>
                      {!item.read && (
                        <View
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: colors.primary,
                            marginTop: 6,
                          }}
                        />
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textSecondary,
                        marginTop: 2,
                        lineHeight: 17,
                      }}
                      numberOfLines={2}
                    >
                      {item.message}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        color: colors.textMuted,
                        marginTop: 4,
                        fontWeight: '500',
                      }}
                    >
                      {relativeTime(item.date)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </ScreenLayout>
  );
}
