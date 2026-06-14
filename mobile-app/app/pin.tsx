import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createMobileIdempotencyKey,
  getProvisionState,
  verifyMobilePin,
} from "../lib/timegate";
import { darkTheme } from "../theme/colors";

export default function PinScreen() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onVerify() {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const state = await getProvisionState();
      if (!state.hasToken) {
        router.replace("/");
        return;
      }
      const result = await verifyMobilePin(employeeId, pin, {
        idempotencyKey: createMobileIdempotencyKey("verify-pin"),
      });
      setMessage(result.message);
      if (result.success) {
        Speech.speak(result.message, { language: "fr-FR" });
        setTimeout(() => router.replace("/"), 2000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={[darkTheme.bgTop, darkTheme.bgBottom]} style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={darkTheme.accent} />
          <Text style={styles.backText}>Retour au scan</Text>
        </Pressable>

        <Text style={styles.title}>Pointage par PIN</Text>
        <Text style={styles.sub}>Fallback si la reconnaissance faciale echoue.</Text>

        <Text style={styles.label}>Identifiant employe</Text>
        <TextInput
          style={styles.input}
          value={employeeId}
          onChangeText={setEmployeeId}
          autoCapitalize="none"
          placeholder="EMP-…"
          placeholderTextColor="rgba(255,255,255,0.4)"
        />

        <Text style={styles.label}>PIN (4–6 chiffres)</Text>
        <TextInput
          style={styles.input}
          value={pin}
          onChangeText={(v) => setPin(v.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          secureTextEntry
          placeholder="••••"
          placeholderTextColor="rgba(255,255,255,0.4)"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed, loading && styles.disabled]}
          disabled={loading || employeeId.trim().length < 3 || pin.length < 4}
          onPress={() => void onVerify()}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>Valider le pointage</Text>
          )}
        </Pressable>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, padding: 20, gap: 8 },
  back: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  backText: { color: darkTheme.accent, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "800", color: "#FFF" },
  sub: { color: darkTheme.textMuted, marginBottom: 8 },
  label: { color: "#EDEAF7", fontSize: 13, fontWeight: "600", marginTop: 6 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    color: "#FFF",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  button: {
    marginTop: 16,
    borderRadius: 999,
    paddingVertical: 16,
    backgroundColor: darkTheme.buttonStart,
    alignItems: "center",
  },
  pressed: { opacity: 0.92 },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  error: { color: "#FECACA", fontSize: 13 },
  success: { color: "#BBF7D0", fontSize: 13 },
});
