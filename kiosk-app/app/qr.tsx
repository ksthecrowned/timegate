import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { MessageBox } from "../components/shared/MessageBox";
import {
  createQrChallenge,
  pollQrChallengeResult,
  type QrChallenge,
} from "../lib/qr-challenge";
import { getProvisionState } from "../lib/timegate";
import { colors, Radius, Spacing } from "../theme/colors";

type QrState = "loading" | "showing" | "success" | "error";
type StatusVariant = "error" | "success" | "warn" | "info";

const POLL_MS = 1500;
const SUCCESS_REDIRECT_MS = 3000;

function speakMessage(message: string, useFallback = false) {
  const text = message.trim();
  if (!text) return;
  const language = useFallback ? undefined : "fr-FR";
  Speech.speak(text, {
    language,
    rate: 0.96,
    pitch: 1,
    onError: () => {
      if (!useFallback) speakMessage(text, true);
    },
  });
}

export default function QrScreen() {
  const router = useRouter();
  const [qrState, setQrState] = useState<QrState>("loading");
  const [challenge, setChallenge] = useState<QrChallenge | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [statusMessage, setStatusMessage] = useState(
    "Scannez ce QR avec l'application employé",
  );
  const [statusVariant, setStatusVariant] = useState<StatusVariant>("info");
  const [provisioned, setProvisioned] = useState(true);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshing = useRef(false);
  const hasChallengeRef = useRef(false);
  const refreshChallengeRef = useRef<() => Promise<void>>(async () => {});

  const clearTimers = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    if (tickTimer.current) {
      clearInterval(tickTimer.current);
      tickTimer.current = null;
    }
    if (redirectTimer.current) {
      clearTimeout(redirectTimer.current);
      redirectTimer.current = null;
    }
  }, []);

  const refreshChallenge = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    clearTimers();
    // Keep the previous QR visible until the next payload is ready (no loading flash).
    if (!hasChallengeRef.current) {
      setQrState("loading");
    }
    try {
      const next = await createQrChallenge();
      hasChallengeRef.current = true;
      setChallenge(next);
      setQrState("showing");
      setStatusVariant("info");
      setStatusMessage(
        next.offline
          ? "Mode hors ligne — scannez avec l'app employé"
          : "Scannez ce QR avec l'application employé",
      );
      const updateCountdown = () => {
        const secs = Math.max(
          0,
          Math.ceil((next.expiresAt.getTime() - Date.now()) / 1000),
        );
        setCountdown(secs);
        if (secs <= 0) {
          void refreshChallengeRef.current();
        }
      };
      updateCountdown();
      tickTimer.current = setInterval(updateCountdown, 500);

      if (next.id) {
        const challengeId = next.id;
        pollTimer.current = setInterval(() => {
          void (async () => {
            const poll = await pollQrChallengeResult(challengeId);
            if (poll.status === "REDEEMED") {
              clearTimers();
              const name = poll.result?.employee
                ? `${poll.result.employee.firstName} ${poll.result.employee.lastName}`.trim()
                : "";
              const msg =
                poll.result?.message ??
                (name ? `Pointage enregistré — ${name}` : "Pointage enregistré");
              setQrState("success");
              setStatusVariant("success");
              setStatusMessage(msg);
              speakMessage(msg);
              redirectTimer.current = setTimeout(() => {
                router.replace("/");
              }, SUCCESS_REDIRECT_MS);
            } else if (poll.status === "EXPIRED") {
              void refreshChallengeRef.current();
            }
          })();
        }, POLL_MS);
      }
    } catch (err) {
      clearTimers();
      // Only surface error UI if we have nothing to show; otherwise keep the old QR.
      if (!hasChallengeRef.current) {
        setQrState("error");
        setStatusVariant("error");
        setStatusMessage(
          err instanceof Error ? err.message : "Erreur challenge QR",
        );
      } else {
        setStatusVariant("warn");
        setStatusMessage(
          err instanceof Error
            ? `Actualisation impossible: ${err.message}`
            : "Actualisation impossible. Conservez le code affiché.",
        );
        setQrState("showing");
      }
    } finally {
      refreshing.current = false;
    }
  }, [clearTimers, router]);

  refreshChallengeRef.current = refreshChallenge;

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  useEffect(() => {
    void (async () => {
      const state = await getProvisionState();
      if (!state.hasToken) {
        setProvisioned(false);
        setQrState("error");
        setStatusVariant("error");
        setStatusMessage(
          "Appareil non configuré. Revenez à l'accueil pour le configurer.",
        );
        return;
      }
      await refreshChallenge();
    })();
  }, [refreshChallenge]);

  if (!provisioned) {
    return (
      <SafeAreaView style={styles.safe}>
        <MessageBox variant="error" message={statusMessage} />
        <Pressable style={styles.secondaryBtn} onPress={() => router.replace("/")}>
          <Text style={styles.secondaryBtnText}>Retour</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/")} hitSlop={12}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Pointage QR</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.body}>
        <MessageBox variant={statusVariant} message={statusMessage} />

        {qrState === "loading" && !challenge && (
          <ActivityIndicator
            size="large"
            color={colors.accent}
            style={{ marginTop: Spacing[10] }}
          />
        )}

        {qrState === "showing" && challenge && (
          <View style={styles.qrWrap}>
            <View style={styles.qrCard}>
              <QRCode value={challenge.payload} size={260} />
            </View>
            <Text style={styles.countdown}>Nouveau code dans {countdown}s</Text>
            <Pressable
              style={styles.secondaryBtn}
              onPress={() => void refreshChallenge()}
            >
              <Text style={styles.secondaryBtnText}>Actualiser</Text>
            </Pressable>
          </View>
        )}

        {qrState === "success" && (
          <Ionicons
            name="checkmark-circle"
            size={88}
            color={colors.success}
            style={{ marginTop: Spacing[8] }}
          />
        )}

        {qrState === "error" && (
          <Pressable
            style={styles.primaryBtn}
            onPress={() => void refreshChallenge()}
          >
            <Text style={styles.primaryBtnText}>Réessayer</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[4],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  body: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing[6],
  },
  qrWrap: {
    alignItems: "center",
    marginTop: Spacing[8],
    gap: Spacing[4],
  },
  qrCard: {
    padding: Spacing[6],
    backgroundColor: "#fff",
    borderRadius: Radius.lg,
  },
  countdown: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  primaryBtn: {
    marginTop: Spacing[8],
    backgroundColor: colors.accent,
    paddingHorizontal: Spacing[8],
    paddingVertical: Spacing[4],
    borderRadius: Radius.md,
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondaryBtn: {
    marginTop: Spacing[4],
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[2],
  },
  secondaryBtnText: { color: colors.accent, fontWeight: "600" },
});
