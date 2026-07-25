import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { ScreenLayout } from '@/components/ScreenLayout';
import { useTheme } from '@/hooks/use-theme';
import { employeeApi } from '@/lib/api';
import type { ShiftAssignment } from '@/lib/types';

const S = Spacing;

type PlanningDay = {
  date: string;
  assignments: ShiftAssignment[];
  leaves: unknown[];
  holidays: unknown[];
};

function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  // Monday-based: getDay() returns 0=Sun..6=Sat; map to 0=Mon..6=Sun
  const dayOfWeek = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - dayOfWeek);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function formatDateFr(d: Date): string {
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function PlanningScreen() {
  const theme = useTheme();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [days, setDays] = useState<PlanningDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = useMemo(() => isoDay(weekStart), [weekStart]);
  const to = useMemo(() => isoDay(addDays(weekStart, 6)), [weekStart]);

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await employeeApi.getPlanningCalendar({ from, to });
      setDays(res.days ?? []);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? STRINGS.errors.networkError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    load(true);
  }, [from, to]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  const totalShifts = days.reduce(
    (s, d) => s + (d.assignments?.length ?? 0),
    0,
  );

  const showSpinner = loading && days.length === 0;

  return (
    <ScreenLayout
      title={STRINGS.planning.title}
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
        {/* Week navigation */}
        <View style={styles.weekRow}>
          <Pressable
            onPress={() => setWeekStart((d) => addDays(d, -7))}
            hitSlop={8}
            style={({ pressed }) => [
              styles.weekBtn,
              {
                backgroundColor: theme.surfaceCard,
                borderColor: theme.border,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={18}
              color={theme.text}
            />
          </Pressable>
          <View style={styles.weekLabel}>
            <Text style={[styles.weekDate, { color: theme.text }]}>
              {STRINGS.planning.weekOf(formatDateFr(weekStart))}
            </Text>
            <Text
              style={[
                styles.weekSub,
                { color: theme.textSecondary },
              ]}
            >
              {totalShifts}{' '}
              {totalShifts === 1 ? 'shift prévu' : 'shifts prévus'}
            </Text>
          </View>
          <Pressable
            onPress={() => setWeekStart((d) => addDays(d, 7))}
            hitSlop={8}
            style={({ pressed }) => [
              styles.weekBtn,
              {
                backgroundColor: theme.surfaceCard,
                borderColor: theme.border,
                opacity: pressed ? 0.6 : 1,
              },
            ]}
          >
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.text}
            />
          </Pressable>
        </View>

        {/* Today shortcut */}
        <Pressable
          onPress={() => setWeekStart(startOfWeek(new Date()))}
          hitSlop={8}
          style={({ pressed }) => [styles.todayBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons
            name="today-outline"
            size={14}
            color={theme.primary}
          />
          <Text style={[styles.todayText, { color: theme.primary }]}>
            {STRINGS.planning.thisWeek}
          </Text>
        </Pressable>

        {showSpinner ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : totalShifts === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.surfaceCard },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={48}
              color={theme.textMuted}
            />
            <Text
              style={[
                styles.emptyText,
                { color: theme.textSecondary },
              ]}
            >
              {STRINGS.planning.noData}
            </Text>
          </View>
        ) : (
          days.map((day) => (
            <DayCard key={day.date} day={day} />
          ))
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

function DayCard({ day }: { day: PlanningDay }) {
  const theme = useTheme();
  const date = new Date(day.date);
  const isToday = isoDay(new Date()) === day.date;
  const dayLabel = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const assignments = day.assignments ?? [];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.surfaceCard,
          borderLeftColor: isToday ? theme.primary : 'transparent',
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.dayDate, { color: theme.text }]}>
            {dayLabel}
          </Text>
          {isToday && (
            <Text style={[styles.todayBadge, { color: theme.primary }]}>
              Aujourd'hui
            </Text>
          )}
        </View>
        {day.holidays && day.holidays.length > 0 && (
          <View
            style={[
              styles.holidayBadge,
              { backgroundColor: theme.primary },
            ]}
          >
            <Text style={styles.badgeText}>Férié</Text>
          </View>
        )}
      </View>

      {day.leaves && day.leaves.length > 0 && (
        <Text
          style={[
            styles.leaveHint,
            { color: theme.textSecondary },
          ]}
        >
          En congé ce jour-là
        </Text>
      )}

      {assignments.length === 0 ? (
        <Text style={[styles.noShift, { color: theme.textMuted }]}>
          Aucun shift
        </Text>
      ) : (
        assignments.map((a) => {
          const start = (a as any).startTime
            ? new Date((a as any).startTime).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : null;
          const end = (a as any).endTime
            ? new Date((a as any).endTime).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
              })
            : null;
          return (
            <View
              key={a.id}
              style={[
                styles.assignment,
                { borderColor: theme.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.assignmentName,
                    { color: theme.text },
                  ]}
                >
                  {a.shiftName ?? 'Shift'}
                </Text>
                {a.location ? (
                  <Text
                    style={[
                      styles.assignmentLoc,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {a.location}
                  </Text>
                ) : null}
              </View>
              <Text
                style={[styles.assignmentTime, { color: theme.primary }]}
              >
                {start && end ? `${start} – ${end}` : '—'}
              </Text>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: S[4],
    paddingTop: S[4],
    paddingBottom: S[6],
    alignItems: 'stretch',
    flexGrow: 1,
  },
  centered: { alignItems: 'center', padding: S[8] },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: S[2],
  },
  weekBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  weekLabel: { alignItems: 'center', flex: 1 },
  weekDate: { fontSize: 14, fontWeight: '700' },
  weekSub: { fontSize: 12, marginTop: 2 },
  todayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: S[2],
    marginBottom: S[3],
  },
  todayText: { fontSize: 13, fontWeight: '600' },
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
  emptyText: { fontSize: 15, marginTop: S[3] },
  card: {
    borderRadius: S[3],
    padding: S[4],
    marginBottom: S[3],
    borderLeftWidth: 4,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: S[3],
  },
  dayDate: { fontSize: 16, fontWeight: '600' },
  todayBadge: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 2,
  },
  holidayBadge: {
    paddingHorizontal: S[2],
    paddingVertical: 2,
    borderRadius: S[2],
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  leaveHint: { fontSize: 12, fontStyle: 'italic', marginBottom: S[2] },
  noShift: { fontSize: 13, fontStyle: 'italic' },
  assignment: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: S[2],
    borderTopWidth: 1,
    marginTop: S[2],
  },
  assignmentName: { fontSize: 14, fontWeight: '600' },
  assignmentLoc: { fontSize: 12, marginTop: 2 },
  assignmentTime: { fontSize: 14, fontWeight: '700' },
});