import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { MinTouchTarget, Radius, Spacing } from "@/constants/theme";
import { STRINGS } from "@/constants/strings";
import { ScreenLayout } from "@/components/ScreenLayout";
import { FilterChips } from "@/components/ui/FilterChips";
import { StatusBadge, type StatusTone } from "@/components/ui/StatusBadge";
import { useTheme } from "@/hooks/use-theme";
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

function eventStatusLabel(status: string): string {
  if (status === "ACCEPTED") return "OK";
  if (status === "REVIEW_REQUIRED") return "À valider";
  if (status === "REJECTED") return "Refusé";
  return status;
}

function eventStatusTone(status: string): StatusTone {
  if (status === "ACCEPTED") return "success";
  if (status === "REVIEW_REQUIRED") return "warning";
  if (status === "REJECTED") return "danger";
  return "neutral";
}

export default function AttendanceScreen() {
  const router = useRouter();
  const theme = useTheme();
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
      showBack
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentStyle={styles.contentContainer}
    >
      <Pressable
        onPress={() => router.push("/punch-claim-request")}
        accessibilityRole="button"
        accessibilityLabel={STRINGS.punchClaim.banner}
        style={({ pressed }) => [
          styles.claimBanner,
          { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Ionicons name="alert-circle-outline" size={22} color="#fff" />
        <Text style={styles.claimBannerText}>{STRINGS.punchClaim.banner}</Text>
        <Ionicons name="chevron-forward" size={18} color="#fff" />
      </Pressable>

      <Text
        style={[styles.chipsLabel, { color: theme.textSecondary }]}
        accessibilityRole="header"
      >
        {STRINGS.attendance.dateRange}
      </Text>
      <FilterChips
        options={RANGE_OPTIONS.map((o) => ({
          value: o.key,
          label: o.label,
        }))}
        value={range}
        onChange={setRange}
      />

      {showSpinner ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : error ? (
        <View
          style={[
            styles.errorBox,
            { backgroundColor: theme.dangerSoft, borderColor: theme.danger },
          ]}
        >
          <Text style={[styles.errorText, { color: theme.danger }]}>
            {error}
          </Text>
        </View>
      ) : grouped.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: theme.surfaceCard,
              borderColor: theme.border,
            },
          ]}
        >
          <Ionicons name="time-outline" size={48} color={theme.textMuted} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {STRINGS.attendance.noRecords}
          </Text>
        </View>
      ) : (
        <View>
          {total > 0 && (
            <Text style={[styles.counter, { color: theme.textSecondary }]}>
              {rows.length} sur {total} événements
            </Text>
          )}
          {grouped.map(([day, events]) => (
            <View
              key={day}
              style={[
                styles.dayCard,
                {
                  backgroundColor: theme.surfaceCard,
                  borderColor: theme.border,
                },
              ]}
              accessibilityRole="summary"
              accessibilityLabel={formatDay(`${day}T12:00:00`)}
            >
              <Text style={[styles.dayDate, { color: theme.text }]}>
                {formatDay(`${day}T12:00:00`)}
              </Text>
              {events.map((event) => {
                const typeLabel = EVENT_LABELS[event.type] ?? event.type;
                const statusLabel = eventStatusLabel(event.status);
                return (
                  <View
                    key={event.id}
                    style={[
                      styles.eventRow,
                      { borderTopColor: theme.border },
                    ]}
                    accessible
                    accessibilityLabel={`${typeLabel}, ${formatTime(event.occurredAt)}, ${statusLabel}`}
                  >
                    <View style={styles.eventMain}>
                      <Text style={[styles.eventType, { color: theme.text }]}>
                        {typeLabel}
                      </Text>
                      <Text
                        style={[
                          styles.eventMeta,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {formatTime(event.occurredAt)}
                        {event.kiosk?.name ? ` · ${event.kiosk.name}` : ""}
                        {event.authMethod
                          ? ` · ${AUTH_LABELS[event.authMethod] ?? event.authMethod}`
                          : ""}
                      </Text>
                    </View>
                    <StatusBadge
                      label={statusLabel}
                      tone={eventStatusTone(event.status)}
                    />
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    paddingTop: S[4],
    paddingBottom: S[6],
  },
  claimBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: S[2],
    minHeight: MinTouchTarget,
    borderRadius: Radius.md,
    padding: S[3],
    marginHorizontal: S[4],
    marginBottom: S[4],
  },
  claimBannerText: {
    flex: 1,
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  centered: { alignItems: "center", padding: S[8] },
  chipsLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: S[1],
    paddingHorizontal: S[4],
  },
  errorBox: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: S[3],
    marginHorizontal: S[4],
    marginTop: S[3],
  },
  errorText: { fontSize: 14, textAlign: "center" },
  emptyCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: S[6],
    alignItems: "center",
    marginHorizontal: S[4],
    marginTop: S[4],
  },
  emptyText: { fontSize: 15, marginTop: S[3] },
  counter: {
    fontSize: 12,
    marginBottom: S[2],
    fontWeight: "500",
    paddingHorizontal: S[4],
  },
  dayCard: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: S[4],
    marginHorizontal: S[4],
    marginBottom: S[3],
  },
  dayDate: { fontSize: 15, fontWeight: "600", marginBottom: S[3] },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: MinTouchTarget,
    paddingVertical: S[2],
    borderTopWidth: 1,
    gap: S[2],
  },
  eventMain: { flex: 1 },
  eventType: { fontSize: 14, fontWeight: "600" },
  eventMeta: { fontSize: 12, marginTop: 2 },
});
