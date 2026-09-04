import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Spacing, Radius, MinTouchTarget } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { ScreenLayout } from '@/components/ScreenLayout';
import { TrustedDeviceBanner } from '@/components/TrustedDeviceBanner';
import { useDeviceTrustPending } from '@/components/PendingDeviceBlock';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/use-theme';
import { employeeApi } from '@/lib/api';
import { getMeCached } from '@/lib/meCache';
import {
  getQrOfflineQueueCount,
  syncQrOfflineQueue,
} from '@/lib/qr-offline-queue';
import type { AttendanceEventRow, Profile } from '@/lib/types';

type DayStatus =
  | 'not_started'
  | 'on_site'
  | 'on_break'
  | 'done'
  | 'off'
  | 'leave'
  | 'holiday'
  | 'unknown';

type TodaySchedule = Awaited<ReturnType<typeof employeeApi.getTodaySchedule>>;

type PrimaryAction = {
  label: string;
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
  sensitive?: boolean;
};

type Shortcut = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  sensitive?: boolean;
};

const shortcuts: Shortcut[] = [
  {
    label: STRINGS.home.actionRequestLeave,
    icon: 'calendar-outline',
    href: '/leave-request',
  },
  {
    label: STRINGS.home.actionMyPlanning,
    icon: 'calendar-number-outline',
    href: '/planning',
  },
  {
    label: STRINGS.home.actionAttendance,
    icon: 'time-outline',
    href: '/attendance',
  },
  {
    label: STRINGS.more.leaveBalances,
    icon: 'pie-chart-outline',
    href: '/leave-balances',
  },
];

function isoDay(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function formatTime(iso?: string | null): string {
  if (!iso) return '';
  if (/^\d{2}:\d{2}/.test(iso)) return iso.slice(0, 5);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function derivePunchStatus(events: AttendanceEventRow[]): DayStatus {
  if (events.length === 0) return 'not_started';
  const sorted = [...events].sort(
    (a, b) =>
      new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
  const last = sorted[sorted.length - 1];
  if (last.type === 'CHECK_OUT') return 'done';
  if (last.type === 'BREAK_START') return 'on_break';
  if (last.type === 'CHECK_IN' || last.type === 'BREAK_END') return 'on_site';
  return 'unknown';
}

function statusLabel(status: DayStatus, schedule: TodaySchedule | null): string {
  switch (status) {
    case 'not_started':
      return STRINGS.home.statusNotStarted;
    case 'on_site':
      return STRINGS.home.statusOnSite;
    case 'on_break':
      return STRINGS.home.statusOnBreak;
    case 'done':
      return STRINGS.home.statusDone;
    case 'off':
      return STRINGS.home.statusOff;
    case 'leave':
      return schedule?.leaveType
        ? `${STRINGS.home.statusLeave} · ${schedule.leaveType}`
        : STRINGS.home.statusLeave;
    case 'holiday':
      return schedule?.holidayName
        ? `${STRINGS.home.statusHoliday} · ${schedule.holidayName}`
        : STRINGS.home.statusHoliday;
    default:
      return STRINGS.home.statusUnknown;
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const devicePending = useDeviceTrustPending();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [todaySchedule, setTodaySchedule] = useState<TodaySchedule | null>(
    null,
  );
  const [dayEvents, setDayEvents] = useState<AttendanceEventRow[]>([]);
  const [breakEligible, setBreakEligible] = useState(false);
  const [offlinePending, setOfflinePending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const today = isoDay();
      const [me, leaves, schedule, events, breakStatus, offlineCount] =
        await Promise.all([
          getMeCached().catch(() => null),
          employeeApi
            .getLeaves({ status: 'pending', limit: 100 })
            .catch(() => null),
          employeeApi.getTodaySchedule().catch(() => null),
          employeeApi
            .getAttendanceEvents({
              page: 1,
              limit: 50,
              from: `${today}T00:00:00.000Z`,
              to: `${today}T23:59:59.999Z`,
            })
            .catch(() => null),
          employeeApi.getBreakResumeStatus().catch(() => null),
          getQrOfflineQueueCount().catch(() => 0),
        ]);

      setProfile(me);
      setPendingLeaves(leaves?.meta?.total ?? leaves?.data?.length ?? 0);
      setTodaySchedule(schedule);
      setDayEvents(events?.data ?? []);
      setBreakEligible(Boolean(breakStatus?.eligible));
      setOfflinePending(offlineCount);
    } catch {
      // Soft-fail home metrics
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const dayStatus = useMemo((): DayStatus => {
    if (breakEligible) return 'on_break';
    const punchStatus = derivePunchStatus(dayEvents);
    if (punchStatus !== 'not_started') return punchStatus;

    if (!todaySchedule) return 'unknown';
    if (todaySchedule.kind === 'leave') return 'leave';
    if (todaySchedule.kind === 'holiday') return 'holiday';
    if (!todaySchedule.isWorkDay || todaySchedule.kind === 'off') return 'off';
    return 'not_started';
  }, [breakEligible, dayEvents, todaySchedule]);

  const primaryAction: PrimaryAction = useMemo(() => {
    // PENDING device: never surface punch/break as primary — point to read-only value.
    if (devicePending) {
      if (
        dayStatus === 'leave' ||
        dayStatus === 'holiday' ||
        dayStatus === 'off'
      ) {
        return {
          label: STRINGS.home.primaryPlanning,
          href: '/planning',
          icon: 'calendar-number-outline',
        };
      }
      return {
        label: STRINGS.home.primaryAttendance,
        href: '/attendance',
        icon: 'time-outline',
      };
    }
    if (breakEligible) {
      return {
        label: STRINGS.home.primaryBreak,
        href: '/break-resume',
        icon: 'cafe-outline',
        sensitive: true,
      };
    }
    if (
      dayStatus === 'leave' ||
      dayStatus === 'holiday' ||
      dayStatus === 'off'
    ) {
      return {
        label: STRINGS.home.primaryPlanning,
        href: '/planning',
        icon: 'calendar-number-outline',
      };
    }
    if (
      dayStatus === 'not_started' ||
      dayStatus === 'on_site' ||
      dayStatus === 'done'
    ) {
      return {
        label: STRINGS.home.primaryPunch,
        href: '/qr-punch',
        icon: 'qr-code-outline',
        sensitive: true,
      };
    }
    return {
      label: STRINGS.home.primaryAttendance,
      href: '/attendance',
      icon: 'time-outline',
    };
  }, [breakEligible, dayStatus, devicePending]);

  const handleNavigate = (href: string, sensitive?: boolean) => {
    if (devicePending && sensitive) {
      Alert.alert(
        STRINGS.auth.devicePendingTitle,
        STRINGS.auth.devicePendingBody,
      );
      return;
    }
    router.push(href as never);
  };

  const handleSyncOffline = async () => {
    if (devicePending) {
      Alert.alert(
        STRINGS.auth.devicePendingTitle,
        STRINGS.auth.devicePendingBody,
      );
      return;
    }
    setSyncing(true);
    try {
      const summary = await syncQrOfflineQueue();
      setOfflinePending(summary.pending);
      if (summary.synced > 0) {
        Alert.alert(
          STRINGS.app.name,
          STRINGS.qrPunch.syncSuccess(summary.synced),
        );
        void loadData(true);
      } else if (summary.failed > 0) {
        Alert.alert(
          STRINGS.app.name,
          summary.lastMessage ?? STRINGS.qrPunch.syncFailed,
        );
      }
    } finally {
      setSyncing(false);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return STRINGS.home.greetingMorning;
    if (hour < 18) return STRINGS.home.greetingAfternoon;
    return STRINGS.home.greetingEvening;
  };

  const displayName = profile?.firstName
    ? `${profile.firstName} ${profile.lastName ?? ''}`.trim()
    : STRINGS.home.welcomeBack;

  const shiftWindow =
    todaySchedule?.shift?.startTime || todaySchedule?.shift?.endTime
      ? `${formatTime(todaySchedule.shift?.startTime)} – ${formatTime(todaySchedule.shift?.endTime)}`
      : '';

  const shiftLine = (() => {
    if (todaySchedule?.kind === 'leave') {
      return todaySchedule.leaveType
        ? `${STRINGS.home.statusLeave} · ${todaySchedule.leaveType}`
        : STRINGS.home.statusLeave;
    }
    if (todaySchedule?.kind === 'holiday') {
      return todaySchedule.holidayName
        ? `${STRINGS.home.statusHoliday} · ${todaySchedule.holidayName}`
        : STRINGS.home.statusHoliday;
    }
    if (todaySchedule?.isWorkDay && todaySchedule.shift) {
      return STRINGS.home.shiftToday(todaySchedule.shift.name, shiftWindow);
    }
    return STRINGS.home.noShiftToday;
  })();

  const primaryBlocked = Boolean(devicePending && primaryAction.sensitive);

  return (
    <ScreenLayout
      title={STRINGS.app.name}
      subtitle={STRINGS.home.appBarSubtitle}
      showSearch={false}
      showNotifications
      refreshing={refreshing}
      onRefresh={() => void loadData(true)}
    >
      <View testID="home_screen" accessibilityLabel={STRINGS.a11y.home}>
        <TrustedDeviceBanner />

        <View
          style={[styles.hero, { backgroundColor: theme.primary }]}
          accessibilityRole="summary"
          accessibilityLabel={`${greeting()} ${displayName}`}
        >
          <Text style={styles.heroGreeting}>{greeting()},</Text>
          <Text style={styles.heroName}>{displayName}</Text>
          {profile?.position || profile?.branchName ? (
            <View style={styles.heroChip}>
              <Ionicons name="briefcase-outline" size={12} color="#fff" />
              <Text style={styles.heroChipText}>
                {[profile.position, profile.branchName]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
          ) : null}
        </View>

        {offlinePending > 0 ? (
          <Pressable
            onPress={() => void handleSyncOffline()}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.home.offlinePending(offlinePending)}
            style={({ pressed }) => [
              styles.offlineBanner,
              {
                backgroundColor: theme.warningSoft,
                borderColor: theme.warning,
                opacity: pressed || syncing ? 0.85 : 1,
              },
            ]}
          >
            {syncing ? (
              <ActivityIndicator color={theme.warning} />
            ) : (
              <Ionicons
                name="cloud-upload-outline"
                size={20}
                color={theme.warning}
              />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.offlineTitle, { color: theme.warning }]}>
                {STRINGS.home.offlinePending(offlinePending)}
              </Text>
              <Text style={[styles.offlineHint, { color: theme.textSecondary }]}>
                {STRINGS.home.offlineSyncNow}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.warning} />
          </Pressable>
        ) : null}

        <Card
          style={styles.todayCard}
          accessibilityLabel={`${STRINGS.home.todayTitle}. ${statusLabel(dayStatus, todaySchedule)}. ${shiftLine}`}
        >
          <Text style={[styles.todayEyebrow, { color: theme.textSecondary }]}>
            {STRINGS.home.todayTitle}
          </Text>
          <Text style={[styles.todayStatus, { color: theme.text }]}>
            {loading ? '…' : statusLabel(dayStatus, todaySchedule)}
          </Text>
          <Text style={[styles.todayShift, { color: theme.textSecondary }]}>
            {loading ? '…' : shiftLine}
          </Text>

          <Pressable
            testID={
              primaryAction.href === '/qr-punch'
                ? 'home_qr_punch_cta'
                : primaryAction.href === '/break-resume'
                  ? 'home_break_resume_cta'
                  : 'home_primary_cta'
            }
            onPress={() =>
              handleNavigate(primaryAction.href, primaryAction.sensitive)
            }
            accessibilityRole="button"
            accessibilityLabel={primaryAction.label}
            accessibilityHint={
              primaryBlocked ? STRINGS.a11y.actionBlocked : undefined
            }
            disabled={primaryBlocked}
            style={({ pressed }) => [
              styles.primaryCta,
              {
                backgroundColor: theme.primary,
                opacity: pressed || primaryBlocked ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name={primaryAction.icon} size={22} color="#fff" />
            <Text style={styles.primaryCtaText}>{primaryAction.label}</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </Card>

        {pendingLeaves > 0 ? (
          <Pressable
            onPress={() => router.push('/leave' as never)}
            accessibilityRole="button"
            accessibilityLabel={`${pendingLeaves} ${STRINGS.home.pending}`}
            style={({ pressed }) => [
              styles.noticeRow,
              {
                borderBottomColor: theme.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons
              name="hourglass-outline"
              size={18}
              color={theme.secondary}
            />
            <Text style={[styles.noticeText, { color: theme.text }]}>
              {pendingLeaves === 1
                ? STRINGS.home.pendingLeaveOne
                : STRINGS.home.pendingLeaveMany(pendingLeaves)}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={theme.textMuted}
            />
          </Pressable>
        ) : null}

        <View style={styles.shortcuts}>
          <Text
            style={[styles.sectionTitle, { color: theme.textSecondary }]}
            accessibilityRole="header"
          >
            {STRINGS.home.quickActions}
          </Text>
          {shortcuts.map((action, index) => (
            <Pressable
              key={action.href}
              onPress={() => handleNavigate(action.href, action.sensitive)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              style={({ pressed }) => [
                styles.shortcutRow,
                {
                  borderBottomColor: theme.border,
                  borderBottomWidth:
                    index === shortcuts.length - 1 ? 0 : StyleSheet.hairlineWidth,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Ionicons
                name={action.icon}
                size={20}
                color={theme.primary}
                style={styles.shortcutIcon}
              />
              <Text style={[styles.shortcutLabel, { color: theme.text }]}>
                {action.label}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.textMuted}
              />
            </Pressable>
          ))}
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: Spacing[4],
    marginTop: Spacing[4],
    marginBottom: Spacing[3],
    padding: Spacing[5],
    borderRadius: Radius.lg,
  },
  heroGreeting: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  heroName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 12,
  },
  heroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  heroChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  offlineBanner: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    padding: Spacing[3],
    borderRadius: Radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    minHeight: MinTouchTarget,
  },
  offlineTitle: { fontSize: 14, fontWeight: '700' },
  offlineHint: { fontSize: 12, marginTop: 2 },
  todayCard: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[2],
  },
  todayEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  todayStatus: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: Spacing[1],
  },
  todayShift: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: Spacing[4],
  },
  primaryCta: {
    minHeight: MinTouchTarget + 8,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  primaryCtaText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  noticeRow: {
    marginHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    minHeight: MinTouchTarget,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  shortcuts: {
    marginTop: Spacing[4],
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[2],
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: Spacing[1],
  },
  shortcutRow: {
    minHeight: MinTouchTarget + 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[3],
  },
  shortcutIcon: {
    width: 28,
  },
  shortcutLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
});
