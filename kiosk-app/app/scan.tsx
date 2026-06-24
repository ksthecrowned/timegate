import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CameraView,
  type FaceDetectionResult,
  FaceDetectorClassifications,
  FaceDetectorMode,
  useCameraPermissions,
} from "react-native-face-detector-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  classifyError,
  createMobileIdempotencyKey,
  getProvisionState,
  getVerificationUserMessage,
  isLikelyNetworkError,
  verifyFacePhoto,
  type ErrorCategory,
} from "../lib/timegate";
import {
  enqueueOfflineVerification,
  getPendingVerifyCount,
  syncOfflineVerifications,
} from "../lib/offline-verify-queue";
import { MessageBox } from "../components/shared/MessageBox";
import { colors, Radius, Spacing } from "../theme/colors";

type VerifyState = "idle" | "verifying" | "success" | "error";
const VERIFY_TIMEOUT_SECONDS = 60;
const AUTO_RESET_SECONDS = 10;
const SUCCESS_REDIRECT_SECONDS = 2;
const LOCAL_DETECTION_COOLDOWN_MS = 10000;
const OFFLINE_SYNC_INTERVAL_MS = 15000;

// Vertical bands reserved for the fixed overlays — the CaptureStage is
// placed in the remaining space so the dark scrim never overlaps the
// header or the footer card.
const HEADER_HEIGHT = 64; // back/PIN/title row
const FOOTER_HEIGHT = 130; // progress card
const TOAST_GAP = 4;
const SPACER = 8;

function speakMessage(message: string, useFallback = false) {
  const text = message.trim();
  if (!text) return;
  const language = useFallback ? undefined : "fr-FR";
  Speech.speak(text, {
    language,
    rate: 0.96,
    pitch: 1,
    onStart: () =>
      console.log("[TimeGateMobile][speech] start", {
        language: language ?? "default",
      }),
    onDone: () => console.log("[TimeGateMobile][speech] done"),
    onError: () => {
      if (!useFallback) {
        console.warn(
          "[TimeGateMobile][speech] failed with fr-FR, retrying with default voice",
        );
        speakMessage(text, true);
        return;
      }
      console.warn("[TimeGateMobile][speech] failed with default voice");
    },
  });
}

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView | null>(null);
  const captureInFlight = useRef(false);
  const lastDetectionAttemptAtRef = useRef(0);
  /** Oval capture area in viewport coordinates, refreshed on layout. */
  const ovalBoundsRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [statusMessage, setStatusMessage] = useState(
    "Placez votre visage dans le cadre pour lancer la vérification.",
  );
  const [statusVariant, setStatusVariant] =
    useState<ErrorCategory | "success" | "info">("info");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [verifyElapsedSeconds, setVerifyElapsedSeconds] = useState(0);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const feedbackOpacity = useRef(new Animated.Value(0)).current;

  const resetToIdle = useCallback(() => {
    captureInFlight.current = false;
    setVerifyState("idle");
    setConfidence(null);
    setVerifyElapsedSeconds(0);
    setCapturedPhotoUri(null);
    setEmployeeName(null);
    setStatusVariant("info");
    setStatusMessage(
      "Placez votre visage dans le cadre pour lancer la vérification.",
    );
  }, []);

  const verifyingMessage = useMemo(() => {
    if (verifyElapsedSeconds < 4) return "Capture envoyée à l'API...";
    if (verifyElapsedSeconds < 10) return "Analyse du visage en cours...";
    return `Vérification en cours (${verifyElapsedSeconds}s)...`;
  }, [verifyElapsedSeconds]);
  const topFeedbackMessage =
    verifyState === "verifying" ? verifyingMessage : statusMessage;
  const progressPercent = useMemo(() => {
    if (verifyState === "verifying") {
      return Math.min(
        100,
        Math.max(1, Math.round((verifyElapsedSeconds / VERIFY_TIMEOUT_SECONDS) * 100)),
      );
    }
    if (confidence != null) {
      return Math.round(confidence * 100);
    }
    return 0;
  }, [confidence, verifyElapsedSeconds, verifyState]);

  const runVerification = useCallback(async () => {
    if (!cameraRef.current || captureInFlight.current || verifyState === "verifying") return;

    console.log("[TimeGateMobile][scan] live detection triggered verification");
    captureInFlight.current = true;
    let shouldAutoReset = false;
    let shouldRedirectHome = false;
    let capturedPhotoForRetry: string | null = null;

    try {
      setVerifyState("verifying");
      setVerifyElapsedSeconds(0);
      setStatusVariant("info");
      setStatusMessage("Visage détecté en direct. Capture et envoi au serveur...");
      const photo = await cameraRef.current.takePictureAsync({
        skipProcessing: false,
        quality: 0.88,
      });
      if (!photo?.uri) {
        throw new Error("Capture photo indisponible.");
      }
      capturedPhotoForRetry = photo.uri;
      setCapturedPhotoUri(photo.uri);

      const result = await verifyFacePhoto(photo.uri, VERIFY_TIMEOUT_SECONDS * 1000, {
        idempotencyKey: createMobileIdempotencyKey("verify-online"),
      });
      setConfidence(result.confidence);
      setEmployeeName(result.employeeName);
      const resultMessage = result.message?.trim()
        ? result.message
        : result.success
          ? "Pointage enregistré."
          : "Vérification échouée. Réessayez.";
      setStatusMessage(resultMessage);

      console.log("[TimeGateMobile][scan] verification result", result);

      if (result.success) {
        setVerifyState("success");
        setStatusVariant("success");
        shouldRedirectHome = true;
        console.log("[TimeGateMobile][scan] verification success", {
          confidence: result.confidence,
          message: result.message,
        });
        speakMessage(resultMessage);
      } else {
        setVerifyState("error");
        setStatusVariant("error");
        shouldAutoReset = true;
        speakMessage(resultMessage);
        console.warn("[TimeGateMobile][scan] verification failed (not matched)", {
          confidence: result.confidence,
          message: resultMessage,
        });
      }
    } catch (error) {
      if (isLikelyNetworkError(error) && capturedPhotoForRetry) {
        const pending = await enqueueOfflineVerification(capturedPhotoForRetry);
        setPendingSyncCount(pending);
        setVerifyState("success");
        setStatusVariant("info");
        shouldAutoReset = true;
        setStatusMessage(
          `Mode hors ligne: capture enregistrée. Synchronisation automatique dès que le réseau revient (${pending} en attente).`,
        );
        console.warn("[TimeGateMobile][scan] network unavailable, verification queued offline", {
          pending,
        });
      } else {
        setVerifyState("error");
        setStatusVariant(classifyError(error));
        shouldAutoReset = true;
        const friendlyMessage = getVerificationUserMessage(error);
        setStatusMessage(friendlyMessage);
        speakMessage(friendlyMessage);
        console.warn("[TimeGateMobile][scan] verification failed", { message: friendlyMessage });
      }
    } finally {
      captureInFlight.current = false;
      if (shouldRedirectHome) {
        setTimeout(() => {
          router.replace("/");
        }, SUCCESS_REDIRECT_SECONDS * 1000);
      }
      if (shouldAutoReset) {
        setTimeout(() => {
          resetToIdle();
        }, AUTO_RESET_SECONDS * 1000);
      }
    }
  }, [resetToIdle, router, verifyState]);

  useEffect(() => {
    if (verifyState !== "verifying") return;
    const id = setInterval(() => {
      setVerifyElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [verifyState]);

  useEffect(() => {
    let mounted = true;
    const refreshAndSync = async () => {
      if (captureInFlight.current) return;
      try {
        const result = await syncOfflineVerifications(VERIFY_TIMEOUT_SECONDS * 1000);
        if (mounted) {
          setPendingSyncCount(result.pending);
          if (result.synced > 0) {
            setStatusVariant("success");
            setStatusMessage(
              `Synchronisation hors ligne terminée: ${result.synced} vérification(s) provisoire(s) validée(s).`,
            );
          }
        }
      } catch {
        if (mounted) {
          const count = await getPendingVerifyCount();
          setPendingSyncCount(count);
        }
      }
    };
    void (async () => {
      const count = await getPendingVerifyCount();
      if (mounted) setPendingSyncCount(count);
      await refreshAndSync();
    })();
    const id = setInterval(() => {
      void refreshAndSync();
    }, OFFLINE_SYNC_INTERVAL_MS);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, []);

  const processFacesDetected = useCallback(
    ({ faces }: FaceDetectionResult) => {
      if (verifyState !== "idle" || captureInFlight.current || !cameraRef.current) return;
      const detectedFaces = Array.isArray(faces) ? faces.length : 0;
      if (detectedFaces < 1) {
        setStatusVariant("info");
        setStatusMessage(
          "Aucun visage détecté. Placez votre visage dans le cadre ovale.",
        );
        return;
      }
      if (detectedFaces > 1) {
        setStatusVariant("warn");
        setStatusMessage(
          "Plusieurs visages détectés. Une seule personne doit se présenter à la fois.",
        );
        return;
      }

      // Position check: the face must be roughly centered in the oval.
      const oval = ovalBoundsRef.current;
      const face = faces[0];
      // react-native-face-detector-camera exposes bounds as { origin: {x,y}, size: {width,height} }
      // in viewport (preview) coordinates.
      const fb = face?.bounds as
        | {
            origin: { x: number; y: number };
            size: { width: number; height: number };
          }
        | undefined;
      if (!oval || !fb) {
        // Layout not measured yet; show a hint and wait.
        setStatusVariant("info");
        setStatusMessage("Centrez votre visage dans le cadre ovale.");
        return;
      }
      const faceCenterX = fb.origin.x + fb.size.width / 2;
      const faceCenterY = fb.origin.y + fb.size.height / 2;

      // 12% inset from the oval edges: we want the face's CENTER to live
      // strictly inside this smaller rectangle, so the face isn't cut off
      // by the dark overlay at the edges.
      const marginX = oval.width * 0.12;
      const marginY = oval.height * 0.12;
      const innerLeft = oval.x + marginX;
      const innerRight = oval.x + oval.width - marginX;
      const innerTop = oval.y + marginY;
      const innerBottom = oval.y + oval.height - marginY;

      const horizontallyCentered =
        faceCenterX >= innerLeft && faceCenterX <= innerRight;
      const verticallyCentered =
        faceCenterY >= innerTop && faceCenterY <= innerBottom;

      if (!horizontallyCentered || !verticallyCentered) {
        setStatusVariant("info");
        setStatusMessage(
          !horizontallyCentered
            ? "Déplacez-vous vers la gauche ou la droite pour centrer votre visage."
            : "Penchez-vous légèrement pour centrer votre visage dans le cadre.",
        );
        return;
      }

      // Size check: the face should fill roughly 35%-80% of the oval height
      // (otherwise it's too small / too close to the camera).
      const faceRatio = fb.size.height / oval.height;
      if (faceRatio < 0.32) {
        setStatusVariant("info");
        setStatusMessage("Rapprochez-vous de la caméra.");
        return;
      }
      if (faceRatio > 0.85) {
        setStatusVariant("info");
        setStatusMessage("Éloignez-vous un peu de la caméra.");
        return;
      }

      // Face is centered and properly sized → arm the verification.
      setStatusVariant("info");
      setStatusMessage(
        "Visage détecté et centré. Vérification en cours de préparation...",
      );
      const now = Date.now();
      if (now - lastDetectionAttemptAtRef.current < LOCAL_DETECTION_COOLDOWN_MS) return;
      lastDetectionAttemptAtRef.current = now;
      void runVerification();
    },
    [runVerification, verifyState],
  );

  useEffect(() => {
    if (verifyState !== "idle") return;
    const now = Date.now();
    if (now - lastDetectionAttemptAtRef.current > LOCAL_DETECTION_COOLDOWN_MS) {
      setStatusVariant("info");
      setStatusMessage(
        "Placez votre visage dans le cadre pour lancer la vérification.",
      );
    }
  }, [verifyState]);

  useEffect(() => {
    void (async () => {
      const state = await getProvisionState();
      if (!state.hasToken) router.replace("/");
    })();
  }, [router]);

  useEffect(() => {
    if (!topFeedbackMessage?.trim()) return;
    feedbackOpacity.setValue(0);
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(feedbackOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.delay(1200),
        Animated.timing(feedbackOpacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.delay(120),
      ]),
    );
    pulse.start();
    return () => {
      pulse.stop();
      feedbackOpacity.stopAnimation();
    };
  }, [feedbackOpacity, topFeedbackMessage]);

  if (!permission) {
    return (
      <LinearGradient
        colors={[colors.bgTop, colors.bgBottom]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.center}>
          <ActivityIndicator color={colors.text} />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!permission.granted) {
    return (
      <LinearGradient
        colors={[colors.bgTop, colors.bgBottom]}
        style={styles.gradient}
      >
        <SafeAreaView style={styles.center}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera-outline" size={36} color={colors.tealLight} />
          </View>
          <Text style={styles.title}>Permission caméra requise</Text>
          <Text style={styles.sub}>
            Autorisez l'accès à la caméra pour lancer la reconnaissance
            faciale.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              pressed && styles.actionBtnPressed,
            ]}
            onPress={() => void requestPermission()}
          >
            <Ionicons
              name="camera"
              size={18}
              color="#fff"
              style={{ marginRight: Spacing[2] }}
            />
            <Text style={styles.actionBtnText}>Autoriser la caméra</Text>
          </Pressable>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={6}
          >
            <Text style={styles.backBtnText}>Retour</Text>
          </Pressable>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.fullscreen}>
      {/* Camera / captured photo (full screen, bottom of the stack) */}
      {capturedPhotoUri && verifyState !== "idle" ? (
        <Image
          source={{ uri: capturedPhotoUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <CameraView
          ref={(ref) => {
            cameraRef.current = ref;
          }}
          style={StyleSheet.absoluteFill}
          facing="front"
          faceDetectorSettings={{
            mode: FaceDetectorMode.fast,
            runClassifications: FaceDetectorClassifications.all,
            minDetectionInterval: 250,
          }}
          onFacesDetected={processFacesDetected}
        />
      )}

      {/* Capture area definition: a centered oval. onLayout feeds the absolute
          rectangle to ovalBoundsRef so the face detection callback can
          validate that the face is inside. The oval itself is transparent —
          only its border is drawn (next overlay). */}
      <CaptureStage
        topInset={insets.top + HEADER_HEIGHT + TOAST_GAP}
        bottomInset={insets.bottom + FOOTER_HEIGHT + SPACER}
        onLayoutOval={(rect) => {
          ovalBoundsRef.current = rect;
        }}
        state={verifyState}
      >
        {/* Border of the capture oval (drawn inside the cutout). */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View
            style={[
              styles.ovalBorder,
              verifyState === "verifying" && styles.ovalBorderVerifying,
              verifyState === "success" && styles.ovalBorderSuccess,
              verifyState === "error" && styles.ovalBorderError,
            ]}
          />
        </View>
      </CaptureStage>

      {/* Header (back + PIN) — fixed at the top, never overlaps the oval. */}
      <View
        style={[
          styles.headerWrap,
          { paddingTop: insets.top + Spacing[2] },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.iconBtn,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color="#FFF" />
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.pinLink,
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => router.push("/pin")}
          hitSlop={8}
        >
          <Ionicons
            name="keypad-outline"
            size={14}
            color="#FFF"
            style={{ marginRight: Spacing[1] }}
          />
          <Text style={styles.pinLinkText}>PIN</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>
            {verifyState === "verifying"
              ? "Vérification en cours..."
              : verifyState === "success"
                ? "Vérification réussie"
                : verifyState === "error"
                  ? "Vérification échouée"
                  : "Vérification faciale"}
          </Text>
          <Text style={styles.headerSubTitle} numberOfLines={1}>
            {employeeName
              ? `${employeeName}`
              : "Placez votre visage dans le cadre"}
          </Text>
        </View>
      </View>

      {/* Toast — sits just under the header, above the oval. */}
      <View
        style={[
          styles.toastWrap,
          { top: insets.top + HEADER_HEIGHT + Spacing[1] },
        ]}
      >
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
          message={topFeedbackMessage}
        />
      </View>

      {/* Footer progress card — fixed at the bottom, never overlaps the oval. */}
      <View
        style={[
          styles.footerWrap,
          { paddingBottom: insets.bottom + Spacing[2] },
        ]}
      >
        <View
          style={[
            styles.progressCard,
            verifyState === "verifying" && styles.progressCardVerifying,
            verifyState === "success" && styles.progressCardSuccess,
            verifyState === "error" && styles.progressCardError,
          ]}
        >
          <View style={styles.progressRow}>
            <View
              style={[
                styles.stateIconWrap,
                verifyState === "verifying" && styles.stateIconVerifying,
                verifyState === "success" && styles.stateIconSuccess,
                verifyState === "error" && styles.stateIconError,
              ]}
            >
              <Ionicons
                name={
                  verifyState === "verifying"
                    ? "sync"
                    : verifyState === "success"
                      ? "checkmark"
                      : verifyState === "error"
                        ? "close"
                        : "scan-outline"
                }
                size={24}
                color="#fff"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.progressLabel}>
                {verifyState === "verifying"
                  ? "Vérification de votre visage..."
                  : verifyState === "success"
                    ? employeeName
                      ? `Bienvenue ${employeeName}`
                      : "Pointage enregistré"
                    : verifyState === "error"
                      ? "Échec de la vérification"
                      : "En attente d'un visage centré"}
              </Text>
              {verifyState === "verifying" || confidence != null ? (
                <Text style={styles.progressValue}>
                  {`${progressPercent}%`}
                </Text>
              ) : null}
            </View>
          </View>
          {pendingSyncCount > 0 ? (
            <View style={styles.offlineBadge}>
              <Ionicons
                name="cloud-offline-outline"
                size={14}
                color={colors.warnText}
              />
              <Text style={styles.offlineBadgeText}>
                {`${pendingSyncCount} vérification(s) en attente de synchro`}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/**
 * CaptureStage draws the dark overlay that masks everything outside the
 * central oval cutout, and reports the oval's viewport coordinates to the
 * parent so face detection can validate that the user's face is centered.
 */
function CaptureStage({
  topInset,
  bottomInset,
  onLayoutOval,
  state,
  children,
}: {
  topInset: number;
  bottomInset: number;
  onLayoutOval: (rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  state: VerifyState;
  children: React.ReactNode;
}) {
  const [stageSize, setStageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Oval dimensions: 70% width / 50% height of the stage, capped to a
  // comfortable portrait ratio.
  const ovalWidth = stageSize ? Math.min(stageSize.width * 0.7, 320) : 0;
  const ovalHeight = stageSize ? Math.min(stageSize.height * 0.55, 380) : 0;
  // Force a 4:5 portrait aspect if the screen is tall enough
  const finalOvalWidth = ovalWidth;
  const finalOvalHeight = Math.max(ovalHeight, finalOvalWidth * 1.25);

  const ovalLeft = stageSize ? (stageSize.width - finalOvalWidth) / 2 : 0;
  const ovalTop = stageSize
    ? (stageSize.height - finalOvalHeight) / 2
    : 0;

  const overlayColor =
    state === "success"
      ? "rgba(2, 6, 23, 0.78)"
      : state === "error"
        ? "rgba(2, 6, 23, 0.78)"
        : "rgba(2, 6, 23, 0.72)";

  return (
    <View
      style={styles.captureStage}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setStageSize({ width, height });
      }}
    >
      {/* Dark scrim outside the oval cutout (4 rectangles). */}
      {stageSize ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {/* Top band */}
          <View
            style={[
              styles.scrim,
              {
                top: 0,
                left: 0,
                right: 0,
                height: ovalTop,
                backgroundColor: overlayColor,
              },
            ]}
          />
          {/* Bottom band */}
          <View
            style={[
              styles.scrim,
              {
                top: ovalTop + finalOvalHeight,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: overlayColor,
              },
            ]}
          />
          {/* Left band */}
          <View
            style={[
              styles.scrim,
              {
                top: ovalTop,
                left: 0,
                width: ovalLeft,
                height: finalOvalHeight,
                backgroundColor: overlayColor,
              },
            ]}
          />
          {/* Right band */}
          <View
            style={[
              styles.scrim,
              {
                top: ovalTop,
                right: 0,
                width: ovalLeft,
                height: finalOvalHeight,
                backgroundColor: overlayColor,
              },
            ]}
          />
        </View>
      ) : null}

      {stageSize ? (
        <View
          style={{
            position: "absolute",
            left: ovalLeft,
            top: ovalTop,
            width: finalOvalWidth,
            height: finalOvalHeight,
          }}
          onLayout={(e) => {
            const { x, y, width, height } = e.nativeEvent.layout;
            // The CaptureStage fills the available space between the
            // header and the footer. Its layout origin is therefore
            // already relative to the camera (which is absoluteFill).
            onLayoutOval({ x, y, width, height });
          }}
        >
          {children}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  fullscreen: { flex: 1, backgroundColor: colors.bgDeep },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing[6],
    gap: Spacing[3],
  },
  permissionIcon: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    backgroundColor: "rgba(13, 148, 136, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[2],
  },
  /** Header band — fixed at the top, height reserved via HEADER_HEIGHT. */
  headerWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    paddingHorizontal: Spacing[4],
    flexDirection: "row",
    alignItems: "center",
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
  pinLink: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
  },
  pinLinkText: { color: "#FFF", fontWeight: "700", fontSize: 12 },
  headerTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "left",
  },
  headerSubTitle: {
    color: "rgba(255,255,255,0.86)",
    textAlign: "left",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  title: { color: colors.text, fontSize: 22, fontWeight: "700", textAlign: "center" },
  sub: {
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
    fontSize: 14,
  },
  /** Capture stage sits between header and footer. It draws the dark scrim
   * around the oval cutout. The oval's coordinates are reported upward via
   * onLayout so face detection can validate centering. */
  captureStage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: HEADER_HEIGHT,
    paddingBottom: FOOTER_HEIGHT + SPACER,
  },
  scrim: {
    position: "absolute",
  },
  /** Border of the oval (transparent inside). */
  ovalBorder: {
    flex: 1,
    borderRadius: 9999,
    borderWidth: 4,
    borderColor: colors.tealLight,
    backgroundColor: "transparent",
  },
  ovalBorderVerifying: { borderColor: colors.teal },
  ovalBorderSuccess: { borderColor: colors.success },
  ovalBorderError: { borderColor: colors.error },
  toastWrap: {
    position: "absolute",
    left: Spacing[4],
    right: Spacing[4],
  },
  /** Footer progress card band — fixed at the bottom, height reserved via FOOTER_HEIGHT. */
  footerWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing[4],
  },
  progressCard: {
    borderRadius: Radius.xl,
    backgroundColor: "rgba(2, 6, 23, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(13, 148, 136, 0.4)",
    padding: Spacing[3],
    gap: Spacing[2],
  },
  progressCardVerifying: {
    borderColor: "rgba(13, 148, 136, 0.6)",
  },
  progressCardSuccess: {
    borderColor: colors.successBorder,
    backgroundColor: "rgba(16, 185, 129, 0.18)",
  },
  progressCardError: {
    borderColor: colors.errorBorder,
    backgroundColor: "rgba(239, 68, 68, 0.18)",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[3],
  },
  stateIconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  stateIconVerifying: { backgroundColor: colors.teal },
  stateIconSuccess: { backgroundColor: colors.success },
  stateIconError: { backgroundColor: colors.error },
  progressValue: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  progressLabel: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 14,
    fontWeight: "600",
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing[1],
    alignSelf: "flex-start",
    backgroundColor: colors.warnSoft,
    borderColor: "rgba(245, 158, 11, 0.4)",
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing[2],
    paddingVertical: Spacing[1],
  },
  offlineBadgeText: {
    color: colors.warnText,
    fontSize: 12,
    fontWeight: "600",
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
  backBtn: {
    marginTop: Spacing[2],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
  },
  backBtnText: { color: colors.textSecondary, fontWeight: "600" },
});
