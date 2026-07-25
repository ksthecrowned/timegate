import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";

import { MinTouchTarget, Radius, Spacing } from "@/constants/theme";
import { STRINGS } from "@/constants/strings";
import { ScreenLayout } from "@/components/ScreenLayout";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { useTheme } from "@/hooks/use-theme";
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

async function shareContract(url: string, fileName: string) {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    await openContract(url);
    return;
  }
  const safeName = fileName.replace(/[^\w.-]+/g, "_") || "contrat.pdf";
  const destination = new File(Paths.cache, safeName);
  const downloaded = await File.downloadFileAsync(url, destination, {
    idempotent: true,
  });
  await Sharing.shareAsync(downloaded.uri, {
    mimeType: "application/pdf",
    dialogTitle: STRINGS.contracts.sharePdf,
    UTI: "com.adobe.pdf",
  });
}

export default function ContractsScreen() {
  const theme = useTheme();
  const [rows, setRows] = useState<EmployeeContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const handleShare = async (row: EmployeeContractRow) => {
    if (!row.contractFileUrl) return;
    setBusyId(row.id);
    try {
      await shareContract(
        row.contractFileUrl,
        `contrat-${row.id.slice(0, 8)}.pdf`,
      );
    } catch {
      Alert.alert(STRINGS.contracts.title, STRINGS.contracts.shareError);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScreenLayout
      title={STRINGS.contracts.title}
      showBack
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {loading && rows.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title={STRINGS.contracts.noContracts}
          hint={STRINGS.contracts.noContractsHint}
        />
      ) : (
        <View style={styles.content}>
          {rows.map((row) => {
            const busy = busyId === row.id;
            return (
              <View
                key={row.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.surfaceCard,
                    borderColor: theme.border,
                  },
                ]}
                accessibilityRole="summary"
                accessibilityLabel={
                  row.isCurrent
                    ? STRINGS.contracts.currentContract
                    : STRINGS.contracts.pastContract
                }
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    {row.isCurrent
                      ? STRINGS.contracts.currentContract
                      : STRINGS.contracts.pastContract}
                  </Text>
                  {row.isCurrent ? (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: theme.successSoft },
                      ]}
                    >
                      <Text style={[styles.badgeText, { color: theme.success }]}>
                        {STRINGS.contracts.active}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.meta, { color: theme.textSecondary }]}>
                  {STRINGS.contracts.signedAt}: {formatDate(row.signedAt)}
                </Text>
                {row.expiresAt ? (
                  <Text style={[styles.meta, { color: theme.textSecondary }]}>
                    {STRINGS.contracts.expiresAt}: {formatDate(row.expiresAt)}
                  </Text>
                ) : null}
                {row.notes ? (
                  <Text style={[styles.notes, { color: theme.text }]}>
                    {row.notes}
                  </Text>
                ) : null}
                {row.contractFileUrl ? (
                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => void openContract(row.contractFileUrl!)}
                      accessibilityRole="button"
                      accessibilityLabel={STRINGS.contracts.viewPdf}
                      style={({ pressed }) => [
                        styles.pdfBtn,
                        {
                          borderColor: theme.primary,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Ionicons
                        name="eye-outline"
                        size={18}
                        color={theme.primary}
                      />
                      <Text
                        style={[styles.pdfBtnText, { color: theme.primary }]}
                      >
                        {STRINGS.contracts.viewPdf}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void handleShare(row)}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel={STRINGS.contracts.sharePdf}
                      style={({ pressed }) => [
                        styles.pdfBtn,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.surfaceMuted,
                          opacity: pressed || busy ? 0.7 : 1,
                        },
                      ]}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : (
                        <Ionicons
                          name="share-outline"
                          size={18}
                          color={theme.text}
                        />
                      )}
                      <Text style={[styles.pdfBtnText, { color: theme.text }]}>
                        {busy
                          ? STRINGS.contracts.sharingPdf
                          : STRINGS.contracts.sharePdf}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Text style={[styles.noPdf, { color: theme.textMuted }]}>
                    {STRINGS.contracts.noPdf}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { padding: S[4], paddingBottom: S[10] },
  centered: { padding: S[8], alignItems: "center" },
  card: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: S[4],
    marginBottom: S[3],
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S[2],
    gap: S[2],
  },
  cardTitle: { fontSize: 16, fontWeight: "700", flex: 1 },
  badge: {
    paddingHorizontal: S[2],
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  meta: { fontSize: 13, marginBottom: 4 },
  notes: { fontSize: 13, marginTop: S[2], fontStyle: "italic" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: S[2], marginTop: S[3] },
  pdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: S[2],
    minHeight: MinTouchTarget,
    paddingVertical: S[2],
    paddingHorizontal: S[3],
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  pdfBtnText: { fontWeight: "600", fontSize: 14 },
  noPdf: { fontSize: 12, marginTop: S[2] },
});
