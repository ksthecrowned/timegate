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
import { useRouter } from "expo-router";

import { Colors, Spacing } from "@/constants/theme";
import { STRINGS } from "@/constants/strings";
import { ScreenLayout } from "@/components/ScreenLayout";
import { employeeApi } from "@/lib/api";
import type { AttendanceEventRow } from "@/lib/types";

const S = Spacing;

type RangeKey = "7" | "30" | "90";

const RANGE_OPTIONS: { key: RangeKey; label: string; days: number }[] = [
  { key: "7", label: STRINGS.attendance.last7, days: 7 },
  { key: "30", label: STRINGS.attendance.last30, days: 30 },
  { key: "90", label: STRINGS.attendance.last90, days: 90 },
];

const EVENT_LABELS: Record<string, string> = {
  CHECK_IN: "Arrivée",
  CHECK_OUT: "Départ",
  BREAK_START: "Début pause",
  BREAK_END: "Reprise pause",
};

const AUTH_LABELS: Record<string, string> = {
  FACE: "Visage",
  PIN: "PIN",
  NFC: "NFC",
  QR: "QR",
  MOBILE: "App mobile",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function AttendanceScreen() {
  const router = useRouter();
  const [range, setRange] = useState<RangeKey>("30");
  const [rows, setRows] = useState<AttendanceEventRow[]>([]);
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
      const from = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);
      const res = await employeeApi.getAttendanceEvents({
        page: 1,
        limit: 100,
        from: from.toISOString(),
        to: new Date().toISOString(),
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

  const grouped = useMemo(() => {
    const map = new Map<string, AttendanceEventRow[]>();
    for (const row of rows) {
      const day = row.occurredAt.slice(0, 10);
      const bucket = map.get(day) ?? [];
      bucket.push(row);
      map.set(day, bucket);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [rows]);

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
        <Pressable
          onPress={() => router.push("/punch-claim-request")}
          style={({ pressed }) => [
            styles.claimBanner,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="alert-circle-outline" size={22} color="#fff" />
          <Text style={styles.claimBannerText}>
            {STRINGS.punchClaim.banner}
          </Text>
          <Ionicons name="chevron-forward" size={18} color="#fff" />
        </Pressable>

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
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected
                        ? Colors.light.primary
                        : Colors.light.surfaceCard,
                      borderColor: isSelected
                        ? Colors.light.primary
                        : Colors.light.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? "#fff" : Colors.light.text },
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
                {rows.length} sur {total} événements
              </Text>
            )}
            {grouped.map(([day, events]) => (
              <View
                key={day}
                style={[
                  styles.dayCard,
                  { backgroundColor: Colors.light.surfaceCard },
                ]}
              >
                <Text style={[styles.dayDate, { color: Colors.light.text }]}>
                  {formatDay(`${day}T12:00:00`)}
                </Text>
                {events.map((event) => (
                  <View key={event.id} style={styles.eventRow}>
                    <View style={styles.eventMain}>
                      <Text
                        style={[
                          styles.eventType,
                          { color: Colors.light.text },
                        ]}
                      >
                        {EVENT_LABELS[event.type] ?? event.type}
                      </Text>
                      <Text
                        style={[
                          styles.eventMeta,
                          { color: Colors.light.textSecondary },
                        ]}
                      >
                        {formatTime(event.occurredAt)}
                        {event.kiosk?.name ? ` · ${event.kiosk.name}` : ""}
                        {event.authMethod
                          ? ` · ${AUTH_LABELS[event.authMethod] ?? event.authMethod}`
                          : ""}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.eventStatus,
                        {
                          color:
                            event.status === "REVIEW_REQUIRED"
                              ? "#d97706"
                              : event.status === "REJECTED"
                                ? "#dc2626"
                                : Colors.light.textMuted,
                        },
                      ]}
                    >
                      {event.status === "ACCEPTED"
                        ? "OK"
                        : event.status === "REVIEW_REQUIRED"
                          ? "À valider"
                          : event.status}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingHorizontal: S[4],
    paddingTop: S[4],
    paddingBottom: S[6],
    flexGrow: 1,
  },
  claimBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: S[2],
    backgroundColor: Colors.light.primary,
    borderRadius: S[3],
    padding: S[3],
    marginBottom: S[4],
  },
  claimBannerText: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  centered: { alignItems: "center", padding: S[8] },
  chipsRow: { marginBottom: S[4] },
  chipsLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: S[2],
  },
  chips: { flexDirection: "row", gap: S[2] },
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
  counter: { fontSize: 12, marginBottom: S[2], fontWeight: "500" },
  dayCard: {
    borderRadius: S[3],
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: S[4],
    marginBottom: S[3],
  },
  dayDate: { fontSize: 15, fontWeight: "600", marginBottom: S[3] },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: S[2],
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  eventMain: { flex: 1 },
  eventType: { fontSize: 14, fontWeight: "600" },
  eventMeta: { fontSize: 12, marginTop: 2 },
  eventStatus: { fontSize: 12, fontWeight: "600" },
});
