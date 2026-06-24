import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  classifyError,
  createMobileIdempotencyKey,
  getCooldownState,
  getProvisionState,
  getVerificationUserMessage,
  readNfcBadge,
  recordFailure,
  recordSuccess,
  verifyNfcBadge,
  VERIFY_FAILURE_LIMIT,
  type ErrorCategory,
} from "../lib/timegate";
import { enqueueOfflineNfcVerification } from "../lib/offline-verify-queue";
import { MessageBox } from "../components/shared/MessageBox";
import { colors, Radius, Spacing } from "../theme/colors";

type NfcState = "idle" | "reading" | "verifying" | "success" | "error";

const PULSE_DURATION_MS = 1200;
const READING_PULSE_DURATION_MS = 400;
const READ_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 1500;
const SUCCESS_REDIRECT_SECONDS = 2;

function speakMessage(message: string, useFallback = false) {
  const text = message.trim();
  if (!text) return;
  const language = useFallback ? undefined : "fr-FR";
  Speech.speak(text, {
    language,
    rate: 0.96,
    pitch: 1,
    onError: () => {
      if (!useFallback) {
        speakMessage(text, true);
      }
    },
  });
}

export default function NfcScreen() {
  const router = useRouter();
  const [nfcState, setNfcState] = useState<NfcState>("idle");
  const [statusMessage, setStatusMessage] = useState(
    "Lecteur NFC prêt — patientez...",
  );
  const [statusVariant, setStatusVariant] =
    useState<ErrorCategory | "success" | "info">("info");
  const [attempts, setAttempts] = useState(0);
  const [lastBadgeUid, setLastBadgeUid] = useState<string | null>(null);
  const [provisioned, setProvisioned] = useState(true);
  const [cooldownHint, setCooldownHint] = useState<string | null>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0.6)).current;
  const readInFlight = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPulse = useCallback(() => {
    scaleAnim.stopAnimation();
    opacityAnim.stopAnimation();
    scaleAnim.setValue(1);
    opacityAnim.setValue(0.6);
  }, [scaleAnim, opacityAnim]);

  const startPulse = useCallback(
    (durationMs: number) => {
      stopPulse();
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.12,
              duration: durationMs,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: durationMs,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(opacityAnim, {
              toValue: 1,
              duration: durationMs,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0.6,
              duration: durationMs,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ).start();
    },
    [opacityAnim, scaleAnim, stopPulse],
  );

  const clearTimers = useCallback(() => {
    if (retryTimer.current) {
      clearTimeout(retryTimer.current);
      retryTimer.current = null;
    }
    if (redirectTimer.current) {
      clearTimeout(redirectTimer.current);
      redirectTimer.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      stopPulse();
    };
  }, [clearTimers, stopPulse]);

  // Provisioning + cooldown check on mount.
  useEffect(() => {
    void (async () => {
      const state = await getProvisionState();
      if (!state.hasToken) {
        setProvisioned(false);
        setNfcState("error");
        setStatusVariant("error");
        setStatusMessage(
          "Appareil non configuré. Revenez à l'accueil pour le configurer.",
        );
        return;
      }
      const cooldown = getCooldownState();
      if (cooldown.active) {
        setCooldownHint(
          `Trop de tentatives. Saisie PIN requise (${Math.ceil(
            cooldown.msLeft / 1000,
          )}s).`,
        );
        router.replace({ pathname: "/pin", params: { cooldown: "1" } });
      }
    })();
  }, [router]);

  // Pulse animation follows the state.
  useEffect(() => {
    if (nfcState === "idle") startPulse(PULSE_DURATION_MS);
    else if (nfcState === "reading") startPulse(READING_PULSE_DURATION_MS);
    else stopPulse();
  }, [nfcState, startPulse, stopPulse]);

  const runVerify = useCallback(
    async (uid: string) => {
      setNfcState("verifying");
      setStatusVariant("info");
      setStatusMessage("Vérification du badge...");
      try {
        const result = await verifyNfcBadge(uid, {
          idempotencyKey: createMobileIdempotencyKey("verify-nfc"),
        });
        if (result.success) {
          recordSuccess();
          setAttempts(0);
          setNfcState("success");
          setStatusVariant("success");
          const message = result.message?.trim() || "Pointage enregistré";
          setStatusMessage(message);
          setLastBadgeUid(uid);
          speakMessage(message);
          redirectTimer.current = setTimeout(() => {
            router.replace("/");
          }, SUCCESS_REDIRECT_SECONDS * 1000);
        } else {
          const verdict = recordFailure("nfc");
          const newCount = verdict.locked ? VERIFY_FAILURE_LIMIT : attempts + 1;
          setAttempts(newCount);
          if (verdict.locked) {
            setNfcState("error");
            setStatusVariant("error");
            setStatusMessage(
              `Trop d'échecs (${VERIFY_FAILURE_LIMIT}/${VERIFY_FAILURE_LIMIT}). Bascule vers le PIN.`,
            );
            speakMessage("Trop d'échecs. Saisie du code PIN.");
            redirectTimer.current = setTimeout(() => {
              router.replace({ pathname: "/pin", params: { cooldown: "1" } });
            }, 1500);
          } else {
            setNfcState("error");
            setStatusVariant("error");
            setStatusMessage(
              `Badge non reconnu (${newCount}/${VERIFY_FAILURE_LIMIT}). Réessayez.`,
            );
            speakMessage("Badge non reconnu.");
            retryTimer.current = setTimeout(() => {
              setNfcState("idle");
            }, RETRY_DELAY_MS);
          }
        }
      } catch (error) {
        const isNetwork =
          error instanceof Error &&
          (error.message.toLowerCase().includes("network") ||
            error.message.toLowerCase().includes("failed to fetch"));
        if (isNetwork) {
          const pending = await enqueueOfflineNfcVerification(uid);
          setNfcState("success");
          setStatusVariant("info");
          setStatusMessage(
            `Mode hors ligne: badge enregistré. Synchronisation dès que le réseau revient (${pending} en attente).`,
          );
          redirectTimer.current = setTimeout(() => {
            router.replace("/");
          }, SUCCESS_REDIRECT_SECONDS * 1000);
        } else {
          const verdict = recordFailure("nfc");
          const newCount = verdict.locked
            ? VERIFY_FAILURE_LIMIT
            : attempts + 1;
          setAttempts(newCount);
          if (verdict.locked) {
            setNfcState("error");
            setStatusVariant("error");
            setStatusMessage(
              `Trop d'échecs (${VERIFY_FAILURE_LIMIT}/${VERIFY_FAILURE_LIMIT}). Bascule vers le PIN.`,
            );
            redirectTimer.current = setTimeout(() => {
              router.replace({ pathname: "/pin", params: { cooldown: "1" } });
            }, 1500);
          } else {
            setNfcState("error");
            setStatusVariant(classifyError(error));
            setStatusMessage(getVerificationUserMessage(error));
            retryTimer.current = setTimeout(() => {
              setNfcState("idle");
            }, RETRY_DELAY_MS);
          }
        }
      }
    },
    [attempts, router],
  );

  const runRead = useCallback(async () => {
    if (readInFlight.current) return;
    if (nfcState !== "idle") return;
    readInFlight.current = true;
    setNfcState("reading");
    setStatusVariant("info");
    setStatusMessage("Lecture en cours...");
    try {
      const uid = await readNfcBadge(READ_TIMEOUT_MS);
      setLastBadgeUid(uid);
      await runVerify(uid);
    } catch (error) {
      const verdict = recordFailure("nfc");
      const newCount = verdict.locked ? VERIFY_FAILURE_LIMIT : attempts + 1;
      setAttempts(newCount);
      if (verdict.locked) {
        setNfcState("error");
        setStatusVariant("error");
        setStatusMessage(
          `Trop d'échecs (${VERIFY_FAILURE_LIMIT}/${VERIFY_FAILURE_LIMIT}). Bascule vers le PIN.`,
        );
        redirectTimer.current = setTimeout(() => {
          router.replace({ pathname: "/pin", params: { cooldown: "1" } });
        }, 1500);
      } else {
        setNfcState("error");
        setStatusVariant("warn");
        setStatusMessage(
          error instanceof Error
            ? `Aucun badge détecté (${newCount}/${VERIFY_FAILURE_LIMIT}). Réessayez.`
            : `Aucun badge détecté (${newCount}/${VERIFY_FAILURE_LIMIT}).`,
        );
        retryTimer.current = setTimeout(() => {
          setNfcState("idle");
        }, RETRY_DELAY_MS);
      }
    } finally {
      readInFlight.current = false;
    }
  }, [attempts, nfcState, router, runVerify]);

  // Auto-start reading on mount (and after each error retry).
  useEffect(() => {
    if (!provisioned) return;
    if (cooldownHint) return;
    if (nfcState === "idle") {
      void runRead();
    }
  }, [cooldownHint, nfcState, provisioned, runRead]);

  const handleCancel = useCallback(() => {
    clearTimers();
    stopPulse();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }, [clearTimers, router, stopPulse]);

  const handleUsePin = useCallback(() => {
    clearTimers();
    router.push("/pin");
  }, [clearTimers, router]);

  if (!provisioned) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={56} color={colors.error} />
          <Text style={styles.title}>Appareil non configuré</Text>
          <Text style={styles.sub}>{statusMessage}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && styles.actionBtnPressed,
            ]}
            onPress={handleCancel}
          >
            <Text style={styles.actionBtnText}>Retour à l'accueil</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const iconName =
    nfcState === "verifying"
      ? "sync"
      : nfcState === "success"
        ? "checkmark-circle"
        : nfcState === "error"
          ? "close-circle"
          : "card-outline";

  const iconWrapVariant =
    nfcState === "success"
      ? styles.iconWrapSuccess
      : nfcState === "error"
        ? styles.iconWrapError
        : nfcState === "verifying"
          ? styles.iconWrapVerifying
          : null;

  const isPulsing = nfcState === "idle" || nfcState === "reading";

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={handleCancel}
          style={({ pressed }) => [
            styles.iconBtn,
            pressed && { opacity: 0.7 },
          ]}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Pointage par badge</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {lastBadgeUid
              ? `Dernier UID: ${lastBadgeUid}`
              : "Approchez votre badge du lecteur"}
          </Text>
        </View>
      </View>

      <View style={styles.stage}>
        <Animated.View
          style={[
            styles.iconWrap,
            iconWrapVariant,
            {
              transform: [{ scale: isPulsing ? scaleAnim : 1 }],
              opacity: nfcState === "verifying" ? 0.85 : isPulsing ? opacityAnim : 1,
            },
          ]}
        >
          {nfcState === "verifying" ? (
            <ActivityIndicator size="large" color="#FFF" />
          ) : (
            <Ionicons name={iconName} size={92} color="#FFF" />
          )}
        </Animated.View>

        <Text style={styles.stageTitle}>
          {nfcState === "idle"
            ? "Approchez votre badge"
            : nfcState === "reading"
              ? "Lecture en cours..."
              : nfcState === "verifying"
                ? "Vérification du badge..."
                : nfcState === "success"
                  ? "Pointage enregistré"
                  : "Échec de la lecture"}
        </Text>
        <Text style={styles.stageSub} numberOfLines={2}>
          {statusMessage}
        </Text>
      </View>

      <View style={styles.footer}>
        {statusMessage && nfcState !== "idle" && nfcState !== "reading" ? (
          <MessageBox
            variant={
              statusVariant === "success"
                ? "success"
                : statusVariant === "warn"
                  ? "warn"
                  : statusVariant === "error"
                    ? "error"
                    : "info"
            }
            message={statusMessage}
          />
        ) : null}

        <View style={styles.attemptsRow}>
          {Array.from({ length: VERIFY_FAILURE_LIMIT }, (_, i) => i).map((i) => (
            <View
              key={i}
              style={[
                styles.attemptDot,
                i < attempts && styles.attemptDotActive,
              ]}
            />
          ))}
          <Text style={styles.attemptLabel}>
            {attempts}/{VERIFY_FAILURE_LIMIT} tentative
            {attempts > 1 ? "s" : ""}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.pinFallbackBtn,
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleUsePin}
          hitSlop={6}
        >
          <Ionicons
            name="keypad-outline"
            size={16}
            color={colors.tealLight}
            style={{ marginRight: Spacing[1] }}
          />
          <Text style={styles.pinFallbackText}>Utiliser le code PIN</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgDeep },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing[6],
    gap: Spacing[3],
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  sub: {
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
    fontSize: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[2],
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSub: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    marginTop: 2,
  },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing[6],
    gap: Spacing[4],
  },
  iconWrap: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: colors.tealLight,
    backgroundColor: "rgba(13, 148, 136, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[3],
  },
  iconWrapVerifying: {
    borderColor: colors.teal,
    backgroundColor: "rgba(13, 148, 136, 0.3)",
  },
  iconWrapSuccess: {
    borderColor: colors.success,
    backgroundColor: "rgba(16, 185, 129, 0.3)",
  },
  iconWrapError: {
    borderColor: colors.error,
    backgroundColor: "rgba(239, 68, 68, 0.3)",
  },
  stageTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  stageSub: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    lineHeight: 21,
  },
  footer: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[4],
    gap: Spacing[3],
  },
  attemptsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing[2],
  },
  attemptDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "transparent",
  },
  attemptDotActive: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  attemptLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: Spacing[2],
    fontWeight: "600",
  },
  pinFallbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing[2],
  },
  pinFallbackText: {
    color: colors.tealLight,
    fontWeight: "600",
    fontSize: 14,
  },
  actionBtn: {
    marginTop: Spacing[4],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.pill,
    backgroundColor: colors.teal,
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
  },
  actionBtnPressed: { opacity: 0.92 },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
