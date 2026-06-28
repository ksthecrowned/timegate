import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { MessageBox } from "../components/shared/MessageBox";
import { enqueueOfflineQrVerification } from "../lib/offline-verify-queue";
import {
  classifyError,
  createMobileIdempotencyKey,
  getCooldownState,
  getProvisionState,
  getVerificationUserMessage,
  isLikelyNetworkError,
  recordFailure,
  recordSuccess,
  verifyQrCode,
  VERIFY_FAILURE_LIMIT,
  type ErrorCategory,
} from "../lib/timegate";
import { colors, Radius, Spacing } from "../theme/colors";

type QrState = "idle" | "verifying" | "success" | "error";

const SUCCESS_REDIRECT_SECONDS = 2;
const RETRY_DELAY_MS = 1500;
const SCAN_COOLDOWN_MS = 2500;

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
  const [permission, requestPermission] = useCameraPermissions();
  const [qrState, setQrState] = useState<QrState>("idle");
  const [statusMessage, setStatusMessage] = useState(
    "Présentez votre QR code devant la caméra",
  );
  const [statusVariant, setStatusVariant] =
    useState<ErrorCategory | "success" | "info">("info");
  const [attempts, setAttempts] = useState(0);
  const [provisioned, setProvisioned] = useState(true);
  const [scanEnabled, setScanEnabled] = useState(true);
  const verifyInFlight = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScanAt = useRef(0);

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
      const cooldown = getCooldownState();
      if (cooldown.active) {
        router.replace({ pathname: "/pin", params: { cooldown: "1" } });
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const runVerify = useCallback(
    async (qrPayload: string) => {
      if (verifyInFlight.current) return;
      verifyInFlight.current = true;
      setScanEnabled(false);
      setQrState("verifying");
      setStatusVariant("info");
      setStatusMessage("Vérification du QR code...");
      try {
        const result = await verifyQrCode(qrPayload, {
          idempotencyKey: createMobileIdempotencyKey("verify-qr"),
        });
        if (result.success) {
          recordSuccess();
          setAttempts(0);
          setQrState("success");
          setStatusVariant("success");
          const message = result.message?.trim() || "Pointage enregistré";
          setStatusMessage(message);
          speakMessage(message);
          redirectTimer.current = setTimeout(() => {
            router.replace("/");
          }, SUCCESS_REDIRECT_SECONDS * 1000);
        } else {
          const verdict = recordFailure("qr");
          const newCount = verdict.locked ? VERIFY_FAILURE_LIMIT : attempts + 1;
          setAttempts(newCount);
          if (verdict.locked) {
            setQrState("error");
            setStatusVariant("error");
            setStatusMessage(
              `Trop d'échecs (${VERIFY_FAILURE_LIMIT}/${VERIFY_FAILURE_LIMIT}). Bascule vers le PIN.`,
            );
            redirectTimer.current = setTimeout(() => {
              router.replace({ pathname: "/pin", params: { cooldown: "1" } });
            }, 1500);
          } else {
            setQrState("error");
            setStatusVariant("error");
            setStatusMessage(
              `QR non reconnu (${newCount}/${VERIFY_FAILURE_LIMIT}). Réessayez.`,
            );
            speakMessage("QR code non reconnu.");
            retryTimer.current = setTimeout(() => {
              setQrState("idle");
              setScanEnabled(true);
            }, RETRY_DELAY_MS);
          }
        }
      } catch (error) {
        if (isLikelyNetworkError(error)) {
          const pending = await enqueueOfflineQrVerification(qrPayload);
          setQrState("success");
          setStatusVariant("info");
          setStatusMessage(
            `Mode hors ligne: QR enregistré. Synchronisation dès que le réseau revient (${pending} en attente).`,
          );
          redirectTimer.current = setTimeout(() => {
            router.replace("/");
          }, SUCCESS_REDIRECT_SECONDS * 1000);
        } else {
          const verdict = recordFailure("qr");
          const newCount = verdict.locked
            ? VERIFY_FAILURE_LIMIT
            : attempts + 1;
          setAttempts(newCount);
          if (verdict.locked) {
            setQrState("error");
            setStatusVariant("error");
            setStatusMessage(
              `Trop d'échecs (${VERIFY_FAILURE_LIMIT}/${VERIFY_FAILURE_LIMIT}). Bascule vers le PIN.`,
            );
            redirectTimer.current = setTimeout(() => {
              router.replace({ pathname: "/pin", params: { cooldown: "1" } });
            }, 1500);
          } else {
            setQrState("error");
            setStatusVariant(classifyError(error));
            setStatusMessage(getVerificationUserMessage(error));
            retryTimer.current = setTimeout(() => {
              setQrState("idle");
              setScanEnabled(true);
            }, RETRY_DELAY_MS);
          }
        }
      } finally {
        verifyInFlight.current = false;
      }
    },
    [attempts, router],
  );

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!scanEnabled || qrState !== "idle") return;
      const now = Date.now();
      if (now - lastScanAt.current < SCAN_COOLDOWN_MS) return;
      lastScanAt.current = now;
      const payload = data?.trim();
      if (!payload || payload.length < 8) return;
      void runVerify(payload);
    },
    [qrState, runVerify, scanEnabled],
  );

  const handleCancel = useCallback(() => {
    clearTimers();
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [clearTimers, router]);

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
          <Pressable style={styles.actionBtn} onPress={handleCancel}>
            <Text style={styles.actionBtnText}>Retour à l'accueil</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={56} color={colors.accent} />
          <Text style={styles.title}>Accès caméra requis</Text>
          <Text style={styles.sub}>
            Autorisez la caméra pour scanner les QR codes de pointage.
          </Text>
          <Pressable style={styles.actionBtn} onPress={() => void requestPermission()}>
            <Text style={styles.actionBtnText}>Autoriser la caméra</Text>
          </Pressable>
          <Pressable style={[styles.actionBtn, styles.secondaryBtn]} onPress={handleCancel}>
            <Text style={styles.secondaryBtnText}>Retour</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={handleCancel} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Pointage QR</Text>
        <Pressable onPress={handleUsePin} style={styles.headerBtn}>
          <Ionicons name="keypad-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={
            scanEnabled && qrState === "idle" ? handleBarcodeScanned : undefined
          }
        />
        <View style={styles.scanFrame} pointerEvents="none" />
        {qrState === "verifying" && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <MessageBox variant={statusVariant} message={statusMessage} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgDeep,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "600",
  },
  cameraWrap: {
    flex: 1,
    marginHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  scanFrame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
    margin: 48,
    borderRadius: Radius.md,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    padding: Spacing.md,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  sub: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
  },
  actionBtn: {
    marginTop: Spacing.sm,
    backgroundColor: colors.accent,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
  secondaryBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    color: colors.text,
    fontWeight: "600",
  },
});
