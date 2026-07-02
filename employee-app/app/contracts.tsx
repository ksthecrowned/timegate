import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";

import { Colors, Spacing } from "@/constants/theme";
import { STRINGS } from "@/constants/strings";
import { ScreenLayout } from "@/components/ScreenLayout";
import { employeeApi } from "@/lib/api";
import type { EmployeeContractRow } from "@/lib/types";

const S = Spacing;

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function openContract(url: string) {
  try {
    await WebBrowser.openBrowserAsync(url);
  } catch {
    await Linking.openURL(url);
  }
}

export default function ContractsScreen() {
  const [rows, setRows] = useState<EmployeeContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await employeeApi.getContracts({ page: 1, limit: 50 });
      setRows(res.data ?? []);
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
  }, []);

  useEffect(() => {
    load();
  }, []);

  return (
    <ScreenLayout
      title={STRINGS.contracts.title}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.light.primary}
          />
        }
      >
        {loading && rows.length === 0 ? (
          <ActivityIndicator size="large" color={Colors.light.primary} />
        ) : error ? (
          <Text style={styles.error}>{error}</Text>
        ) : rows.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: Colors.light.surfaceCard }]}>
            <Ionicons name="document-text-outline" size={48} color={Colors.light.textMuted} />
            <Text style={{ color: Colors.light.textSecondary, marginTop: S[3] }}>
              {STRINGS.contracts.noContracts}
            </Text>
          </View>
        ) : (
          rows.map((row) => (
            <View
              key={row.id}
              style={[styles.card, { backgroundColor: Colors.light.surfaceCard }]}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: Colors.light.text }]}>
                  {row.isCurrent
                    ? STRINGS.contracts.currentContract
                    : STRINGS.contracts.pastContract}
                </Text>
                {row.isCurrent ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{STRINGS.contracts.active}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.meta, { color: Colors.light.textSecondary }]}>
                {STRINGS.contracts.signedAt}: {formatDate(row.signedAt)}
              </Text>
              {row.expiresAt ? (
                <Text style={[styles.meta, { color: Colors.light.textSecondary }]}>
                  {STRINGS.contracts.expiresAt}: {formatDate(row.expiresAt)}
                </Text>
              ) : null}
              {row.notes ? (
                <Text style={[styles.notes, { color: Colors.light.text }]}>
                  {row.notes}
                </Text>
              ) : null}
              {row.contractFileUrl ? (
                <Pressable
                  onPress={() => void openContract(row.contractFileUrl!)}
                  style={[styles.pdfBtn, { borderColor: Colors.light.primary }]}
                >
                  <Ionicons name="document-outline" size={18} color={Colors.light.primary} />
                  <Text style={[styles.pdfBtnText, { color: Colors.light.primary }]}>
                    {STRINGS.contracts.viewPdf}
                  </Text>
                </Pressable>
              ) : (
                <Text style={[styles.noPdf, { color: Colors.light.textMuted }]}>
                  {STRINGS.contracts.noPdf}
                </Text>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { padding: S[4], flexGrow: 1 },
  error: { color: "#C0392B", textAlign: "center", padding: S[4] },
  empty: {
    borderRadius: S[4],
    padding: S[6],
    alignItems: "center",
    marginTop: S[4],
  },
  card: {
    borderRadius: S[3],
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: S[4],
    marginBottom: S[3],
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S[2],
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  badge: {
    backgroundColor: "#ecfdf5",
    paddingHorizontal: S[2],
    paddingVertical: 2,
    borderRadius: S[1],
  },
  badgeText: { color: Colors.light.primary, fontSize: 11, fontWeight: "700" },
  meta: { fontSize: 13, marginBottom: 4 },
  notes: { fontSize: 13, marginTop: S[2], fontStyle: "italic" },
  pdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: S[2],
    marginTop: S[3],
    paddingVertical: S[2],
    paddingHorizontal: S[3],
    borderWidth: 1,
    borderRadius: S[2],
    alignSelf: "flex-start",
  },
  pdfBtnText: { fontWeight: "600", fontSize: 14 },
  noPdf: { fontSize: 12, marginTop: S[2] },
});
