import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors, Spacing } from "@/constants/theme";
import { STRINGS } from "@/constants/strings";
import { ScreenLayout } from "@/components/ScreenLayout";
import { employeeApi } from "@/lib/api";
import type { CheckinRow } from "@/lib/types";

const S = Spacing;

type RangeKey = "7" | "30" | "90";

const RANGE_OPTIONS: { key: RangeKey; label: string; days: number }[] = [
  { key: "7", label: STRINGS.attendance.last7, days: 7 },
  { key: "30", label: STRINGS.attendance.last30, days: 30 },
  { key: "90", label: STRINGS.attendance.last90, days: 90 },
];

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default function AttendanceScreen() {
  const [range, setRange] = useState<RangeKey>("30");
  const [rows, setRows] = useState<CheckinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const rangeDays = useMemo(
    () => RANGE_OPTIONS.find((r) => r.key === range)?.days ?? 30,
    [range],
  );

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const from = startOfDay(
        new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000),
      );
      const to = new Date();
      const res = await employeeApi.getCheckins({
        page: 1,
        limit: 100,
        from: from.toISOString(),
        to: to.toISOString(),
      });
      const data = res.data ?? [];
      setRows(data);
      setTotal(res.meta?.total ?? data.length);
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
  }, [rangeDays]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // Group rows by day, then split into check-in / check-out entries.
  const grouped = useMemo(() => groupByDay(rows), [rows]);

  const showSpinner = loading && rows.length === 0;

  return (
    <ScreenLayout
      title={STRINGS.attendance.title}
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
            tintColor={Colors.light.primary}
          />
        }
      >
        {/* Period selector */}
        <View style={styles.chipsRow}>
          <Text
            style={[styles.chipsLabel, { color: Colors.light.textSecondary }]}
          >
            {STRINGS.attendance.dateRange}
          </Text>
          <View style={styles.chips}>
            {RANGE_OPTIONS.map((opt) => {
              const isSelected = opt.key === range;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setRange(opt.key)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? Colors.light.primary
                        : Colors.light.surfaceCard,
                      borderColor: isSelected
                        ? Colors.light.primary
                        : Colors.light.border,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color: isSelected ? "#fff" : Colors.light.text,
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {showSpinner ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.light.primary} />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : grouped.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: Colors.light.surfaceCard },
            ]}
          >
            <Ionicons
              name="time-outline"
              size={48}
              color={Colors.light.textMuted}
            />
            <Text
              style={[styles.emptyText, { color: Colors.light.textSecondary }]}
            >
              {STRINGS.attendance.noRecords}
            </Text>
          </View>
        ) : (
          <View>
            {total > 0 && (
              <Text
                style={[styles.counter, { color: Colors.light.textSecondary }]}
              >
                {rows.length} sur {total} pointages
              </Text>
            )}
            {grouped.map((day) => (
              <DayCard key={day.day} day={day} />
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

type DayGroup = {
  day: string;
  checkIn: CheckinRow | null;
  checkOut: CheckinRow | null;
};

function groupByDay(rows: CheckinRow[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const r of rows) {
    const ts = (r as any).timestamp ?? r.attendanceDate ?? r.date;
    if (!ts) continue;
    const day = isoDay(new Date(ts));
    if (!map.has(day)) map.set(day, { day, checkIn: null, checkOut: null });
    const group = map.get(day)!;
    // Server shape: { type: 'CHECK_IN' | 'CHECK_OUT' }.
    const type = (r as any).type;
    if (type === "CHECK_IN" || type === "IN") {
      if (!group.checkIn) group.checkIn = r;
    } else if (type === "CHECK_OUT" || type === "OUT") {
      if (!group.checkOut) group.checkOut = r;
    }
  }
  return Array.from(map.values()).sort((a, b) => (a.day < b.day ? 1 : -1));
}

function DayCard({ day }: { day: DayGroup }) {
  const date = new Date(day.day);
  const formattedDate = date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const checkInTime = formatTime(day.checkIn);
  const checkOutTime = formatTime(day.checkOut);

  return (
    <View
      style={[styles.dayCard, { backgroundColor: Colors.light.surfaceCard }]}
    >
      <Text style={[styles.dayDate, { color: Colors.light.text }]}>
        {formattedDate}
      </Text>
      <View style={styles.timeRow}>
        <View style={styles.timeBlock}>
          <Text
            style={[styles.timeLabel, { color: Colors.light.textSecondary }]}
          >
            Arrivée
          </Text>
          <Text style={[styles.timeValue, { color: Colors.light.text }]}>
            {checkInTime}
          </Text>
        </View>
        <View
          style={[styles.divider, { backgroundColor: Colors.light.border }]}
        />
        <View style={styles.timeBlock}>
          <Text
            style={[styles.timeLabel, { color: Colors.light.textSecondary }]}
          >
            Départ
          </Text>
          <Text style={[styles.timeValue, { color: Colors.light.text }]}>
            {checkOutTime}
          </Text>
        </View>
      </View>
    </View>
  );
}

function formatTime(row: CheckinRow | null): string {
  if (!row) return "—";
  const ts = (row as any).timestamp ?? row.attendanceDate ?? row.date;
  if (!ts) return "—";
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: S[4],
    paddingTop: S[4],
    paddingBottom: S[6],
    alignItems: "stretch",
    flexGrow: 1,
  },
  centered: { alignItems: "center", padding: S[8] },
  chipsRow: {
    marginBottom: S[4],
  },
  chipsLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: S[2],
  },
  chips: {
    flexDirection: "row",
    gap: S[2],
  },
  chip: {
    flex: 1,
    paddingVertical: S[2],
    paddingHorizontal: S[3],
    borderRadius: S[2],
    borderWidth: 1,
    alignItems: "center",
  },
  chipText: { fontSize: 13, fontWeight: "600" },
  errorBox: {
    backgroundColor: "#FADBD8",
    borderRadius: S[2],
    padding: S[3],
    margin: S[4],
  },
  errorText: { color: "#C0392B", fontSize: 14, textAlign: "center" },
  emptyCard: {
    borderRadius: S[4],
    padding: S[6],
    alignItems: "center",
    marginTop: S[4],
  },
  emptyText: { fontSize: 15, marginTop: S[3] },
  counter: {
    fontSize: 12,
    marginBottom: S[2],
    fontWeight: "500",
  },
  dayCard: {
    borderRadius: S[3],
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: S[4],
    marginBottom: S[3],
  },
  dayDate: { fontSize: 15, fontWeight: "600", marginBottom: S[3] },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeBlock: { flex: 1, alignItems: "center" },
  timeLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  timeValue: { fontSize: 17, fontWeight: "600" },
  divider: { width: 1, height: 30, marginHorizontal: S[3] },
});
