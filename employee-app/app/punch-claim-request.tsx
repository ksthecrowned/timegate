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

import { BottomTabInset, Colors, Spacing } from "@/constants/theme";
import { STRINGS } from "@/constants/strings";
import { employeeApi } from "@/lib/api";
import type { PunchClaimType } from "@/lib/types";

const S = Spacing;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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
  const [workDate, setWorkDate] = useState(todayIso());
  const [claimType, setClaimType] = useState<PunchClaimType>("MISSED_CHECKOUT");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!DATE_REGEX.test(workDate)) {
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
          { backgroundColor: Colors.light.background },
        ]}
      >
        <View
          style={[
            styles.successCard,
            { backgroundColor: Colors.light.surfaceCard },
          ]}
        >
          <Ionicons name="checkmark-circle" size={56} color={Colors.light.primary} />
          <Text style={[styles.successTitle, { color: Colors.light.text }]}>
            {STRINGS.punchClaim.submitSuccess}
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.primaryBtn, { backgroundColor: Colors.light.primary }]}
          >
            <Text style={styles.primaryBtnText}>{STRINGS.app.back}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: Colors.light.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: BottomTabInset + S[6] },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: Colors.light.text }]}>
          {STRINGS.punchClaim.title}
        </Text>
        <Text style={[styles.subtitle, { color: Colors.light.textSecondary }]}>
          {STRINGS.punchClaim.subtitle}
        </Text>

        <Text style={styles.label}>{STRINGS.punchClaim.workDate}</Text>
        <TextInput
          value={workDate}
          onChangeText={setWorkDate}
          placeholder="AAAA-MM-JJ"
          style={[styles.input, { borderColor: Colors.light.border, color: Colors.light.text }]}
        />

        <Text style={styles.label}>{STRINGS.punchClaim.typeLabel}</Text>
        <View style={styles.typeGrid}>
          {CLAIM_TYPES.map((opt) => {
            const selected = opt.key === claimType;
            return (
              <Pressable
                key={opt.key}
                onPress={() => setClaimType(opt.key)}
                style={[
                  styles.typeChip,
                  {
                    borderColor: selected ? Colors.light.primary : Colors.light.border,
                    backgroundColor: selected ? "#ecfdf5" : Colors.light.surfaceCard,
                  },
                ]}
              >
                <Text
                  style={{
                    color: selected ? Colors.light.primary : Colors.light.text,
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

        <Text style={styles.label}>{STRINGS.punchClaim.reasonLabel}</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={4}
          placeholder={STRINGS.punchClaim.reasonPlaceholder}
          style={[
            styles.textarea,
            { borderColor: Colors.light.border, color: Colors.light.text },
          ]}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          onPress={() => void handleSubmit()}
          disabled={loading}
          style={[styles.primaryBtn, { backgroundColor: Colors.light.primary, opacity: loading ? 0.7 : 1 }]}
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
  centered: { justifyContent: "center", alignItems: "center", padding: S[4] },
  scroll: { padding: S[4] },
  title: { fontSize: 22, fontWeight: "700", marginBottom: S[2] },
  subtitle: { fontSize: 14, marginBottom: S[5], lineHeight: 20 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: S[2],
    color: Colors.light.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderRadius: S[2],
    padding: S[3],
    marginBottom: S[4],
    fontSize: 16,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: S[2],
    padding: S[3],
    minHeight: 100,
    textAlignVertical: "top",
    marginBottom: S[4],
    fontSize: 15,
  },
  typeGrid: { flexDirection: "row", flexWrap: "wrap", gap: S[2], marginBottom: S[4] },
  typeChip: {
    borderWidth: 1,
    borderRadius: S[2],
    paddingVertical: S[2],
    paddingHorizontal: S[3],
  },
  errorText: { color: "#C0392B", marginBottom: S[3], fontSize: 14 },
  primaryBtn: {
    borderRadius: S[2],
    paddingVertical: S[3],
    alignItems: "center",
    marginTop: S[2],
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  successCard: {
    borderRadius: S[4],
    padding: S[6],
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginVertical: S[4],
  },
});
