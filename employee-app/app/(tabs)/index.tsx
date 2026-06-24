import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { ScreenLayout } from '@/components/ScreenLayout';
import { employeeApi } from '@/lib/api';
import { getMeCached } from '@/lib/meCache';
import type { Profile } from '@/lib/types';

type QuickStat = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  href: string;
};

const quickActions = [
  {
    label: STRINGS.home.actionRequestLeave,
    icon: 'calendar-outline' as keyof typeof Ionicons.glyphMap,
    color: '#0d9488',
    href: '/leave-request',
  },
  {
    label: STRINGS.home.actionSwapShift,
    icon: 'swap-horizontal-outline' as keyof typeof Ionicons.glyphMap,
    color: '#0284c7',
    href: '/shift-swap-request',
  },
  {
    label: STRINGS.home.actionMyPlanning,
    icon: 'calendar-number-outline' as keyof typeof Ionicons.glyphMap,
    color: '#14b8a6',
    href: '/planning',
  },
  {
    label: STRINGS.home.actionAttendance,
    icon: 'time-outline' as keyof typeof Ionicons.glyphMap,
    color: '#0d9488',
    href: '/attendance',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [profile, setProfile] = useState<Profile | null>(null);
  const [leaveDays, setLeaveDays] = useState<number | null>(null);
  const [pendingLeaves, setPendingLeaves] = useState<number>(0);
  const [pendingSwaps, setPendingSwaps] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const [me, balances, leaves, swaps] = await Promise.all([
        getMeCached().catch(() => null),
        employeeApi
          .getLeaveBalances({ year: new Date().getFullYear() })
          .catch(() => null),
        employeeApi
          .getLeaves({ status: 'pending', limit: 100 })
          .catch(() => null),
        employeeApi
          .getShiftSwaps({ status: 'pending', limit: 100 })
          .catch(() => null),
      ]);

      setProfile(me);
      // Sum remaining days across all leave balances, ignoring unlimited types.
      const totalRemaining = (balances?.balances ?? [])
        .filter((b) => !b.unlimited)
        .reduce((sum, b) => sum + (b.remaining ?? 0), 0);
      setLeaveDays(totalRemaining);
      setPendingLeaves(leaves?.meta?.total ?? leaves?.data?.length ?? 0);
      setPendingSwaps(swaps?.meta?.total ?? swaps?.data?.length ?? 0);
    } catch (err) {
      // Don't block the UI on errors — quick-stats just show 0 / —.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    loadData(true);
  }, [loadData]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return STRINGS.home.greetingMorning;
    if (hour < 18) return STRINGS.home.greetingAfternoon;
    return STRINGS.home.greetingEvening;
  };

  const quickStats: QuickStat[] = [
    {
      label: STRINGS.home.leaveDays,
      value: leaveDays == null ? '—' : String(leaveDays),
      icon: 'calendar',
      color: '#0d9488',
      href: '/leave-balances',
    },
    {
      label: STRINGS.home.pending,
      value: String(pendingLeaves),
      icon: 'hourglass-outline',
      color: '#0284c7',
      href: '/leave-balances',
    },
    {
      label: STRINGS.home.swaps,
      value: String(pendingSwaps),
      icon: 'swap-horizontal',
      color: '#14b8a6',
      href: '/shift-swap-request',
    },
  ];

  return (
    <ScreenLayout
      title={STRINGS.app.name}
      showSearch={false}
      showNotifications
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Greeting card */}
      <View
        style={{
          margin: Spacing[4],
          padding: Spacing[5],
          backgroundColor: colors.primary,
          borderRadius: 16,
          shadowColor: '#0d9488',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <Text
          style={{
            color: '#ffffffcc',
            fontSize: 14,
            fontWeight: '500',
          }}
        >
          {greeting()},
        </Text>
        <Text
          style={{
            color: '#ffffff',
            fontSize: 22,
            fontWeight: '700',
            marginTop: 4,
            marginBottom: 12,
          }}
        >
          {profile?.firstName
            ? `${profile.firstName} ${profile.lastName ?? ''}`.trim()
            : STRINGS.home.welcomeBack}
        </Text>
        {profile?.position && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#ffffff20',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
              alignSelf: 'flex-start',
            }}
          >
            <MaterialCommunityIcons
              name="briefcase-outline"
              size={12}
              color="#ffffff"
            />
            <Text
              style={{
                color: '#ffffff',
                fontSize: 12,
                marginLeft: 4,
                fontWeight: '500',
              }}
            >
              {profile.position}
            </Text>
          </View>
        )}
      </View>

      {/* Quick stats */}
      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: Spacing[4],
          gap: Spacing[3],
          marginBottom: Spacing[4],
        }}
      >
        {quickStats.map((stat) => (
          <Pressable
            key={stat.label}
            onPress={() => router.push(stat.href as any)}
            style={{
              flex: 1,
              padding: Spacing[3],
              backgroundColor: colors.surfaceCard,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: stat.color + '20',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8,
              }}
            >
              <Ionicons name={stat.icon} size={18} color={stat.color} />
            </View>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '700',
                color: colors.text,
              }}
            >
              {loading ? '…' : stat.value}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                marginTop: 2,
              }}
            >
              {stat.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Quick actions */}
      <View style={{ paddingHorizontal: Spacing[4] }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: colors.textSecondary,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginBottom: 8,
          }}
        >
          {STRINGS.home.quickActions}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: Spacing[3],
          }}
        >
          {quickActions.map((action) => (
            <Pressable
              key={action.label}
              onPress={() => router.push(action.href as any)}
              style={{
                width: '48%',
                padding: Spacing[4],
                backgroundColor: colors.surfaceCard,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'flex-start',
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: action.color + '20',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <Ionicons name={action.icon} size={20} color={action.color} />
              </View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: colors.text,
                }}
              >
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Footer space */}
      <View style={{ height: Spacing[8] }} />
    </ScreenLayout>
  );
}