import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { BottomTabInset, MinTouchTarget, Radius, Spacing } from "@/constants/theme";
import { STRINGS } from "@/constants/strings";
import { DateField } from "@/components/ui/DateField";
import { useTheme } from "@/hooks/use-theme";
import { employeeApi } from "@/lib/api";
import type { PunchClaimType } from "@/lib/types";

const S = Spacing;

const CLAIM_TYPES: { key: PunchClaimType; label: string }[] = [
  { key: "EARLY_DEPARTURE", label: STRINGS.punchClaim.types.earlyDeparture },
  { key: "MISSED_CHECKOUT", label: STRINGS.punchClaim.types.missedCheckout },
  { key: "BREAK_NOT_TAKEN", label: STRINGS.punchClaim.types.breakNotTaken },
  { key: "OTHER", label: STRINGS.punchClaim.types.other },
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function PunchClaimRequestScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [workDate, setWorkDate] = useState(todayIso());
  const [claimType, setClaimType] = useState<PunchClaimType>("MISSED_CHECKOUT");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
      setError(STRINGS.punchClaim.invalidDate);
      return;
    }
    if (!reason.trim()) {
      setError(STRINGS.punchClaim.reasonRequired);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await employeeApi.createPunchClaim({
        workDate,
        type: claimType,
        reason: reason.trim(),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message ?? STRINGS.punchClaim.submitError);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.background },
        ]}
      >
        <View
          style={[
            styles.successCard,
            { backgroundColor: theme.surfaceCard, borderColor: theme.border },
          ]}
        >
          <Ionicons name="checkmark-circle" size={56} color={theme.primary} />
          <Text style={[styles.successTitle, { color: theme.text }]}>
            {STRINGS.punchClaim.submitSuccess}
          </Text>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={STRINGS.app.back}
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
          >
            <Text style={styles.primaryBtnText}>{STRINGS.app.back}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: BottomTabInset + S[6] },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: theme.text }]}>
          {STRINGS.punchClaim.title}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {STRINGS.punchClaim.subtitle}
        </Text>

        <DateField
          label={STRINGS.punchClaim.workDate}
          value={workDate}
          onChange={setWorkDate}
          maximumDate={new Date()}
        />

        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {STRINGS.punchClaim.typeLabel}
        </Text>
        <View style={styles.typeGrid}>
          {CLAIM_TYPES.map((opt) => {
            const selected = opt.key === claimType;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setClaimType(opt.key)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={opt.label}
                style={[
                  styles.typeChip,
                  {
                    borderColor: selected ? theme.primary : theme.border,
                    backgroundColor: selected
                      ? theme.successSoft
                      : theme.surfaceCard,
                  },
                ]}
              >
                <Text
                  style={{
                    color: selected ? theme.primary : theme.text,
                    fontWeight: selected ? "700" : "500",
                    fontSize: 13,
                  }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.label, { color: theme.textSecondary }]}>
          {STRINGS.punchClaim.reasonLabel}
        </Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={4}
          placeholder={STRINGS.punchClaim.reasonPlaceholder}
          placeholderTextColor={theme.textMuted}
          style={[
            styles.textarea,
            {
              borderColor: theme.border,
              color: theme.text,
              backgroundColor: theme.surfaceCard,
            },
          ]}
        />

        {error ? (
          <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        ) : null}

        <Pressable
          onPress={() => void handleSubmit()}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.punchClaim.submit}
          style={[
            styles.primaryBtn,
            { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>{STRINGS.punchClaim.submit}</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center", padding: S[4] },
  scroll: { padding: S[4], gap: S[3] },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 14, marginBottom: S[2], lineHeight: 20 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: S[2],
  },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: S[2] },
  typeChip: {
    minHeight: MinTouchTarget,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: S[3],
    paddingVertical: S[2],
    justifyContent: "center",
  },
  textarea: {
    minHeight: 110,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: S[3],
    textAlignVertical: "top",
    fontSize: 15,
  },
  errorText: { fontSize: 14, fontWeight: "600" },
  primaryBtn: {
    marginTop: S[3],
    minHeight: MinTouchTarget + 4,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  successCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: S[6],
    alignItems: "center",
    gap: S[4],
  },
  successTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
});
