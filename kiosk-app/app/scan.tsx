import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import {
    CameraView,
    FaceDetectorClassifications,
    FaceDetectorLandmarks,
    FaceDetectorMode,
    useCameraPermissions,
    type FaceDetectionResult,
} from "react-native-face-detector-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CoachLabel } from "../components/scan/CoachLabel";
import { FaceRing } from "../components/scan/FaceRing";
import { OvalScrimOverlay } from "../components/scan/OvalScrimOverlay";
import { StatusDock } from "../components/scan/StatusDock";
import {
    FacePresenceSmoother,
    faceQualityMessage,
    FaceStabilityTracker,
    faceToDebugSnapshot,
    getFaceQualityIssue,
    hasFaceLandmarks,
    logFaceCaptureDebug,
} from "../lib/face-capture-gate";
import {
    enqueueOfflineVerification,
    getPendingVerifyCount,
    syncOfflineVerifications,
} from "../lib/offline-verify-queue";
import {
    resolveCoachMessage,
    resolveFaceRingMode,
    type ScanCoachSignal,
} from "../lib/scan-ui-state";
import {
    createKioskIdempotencyKey,
    getKioskFeatures,
    getProvisionState,
    getVerificationUserMessage,
    isLikelyNetworkError,
    verifyFacePhoto,
} from "../lib/timegate";
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
const FOOTER_HEIGHT = 130; // status dock
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
      console.log("[TimeGateKiosk][speech] start", {
        language: language ?? "default",
      }),
    onDone: () => console.log("[TimeGateKiosk][speech] done"),
    onError: () => {
      if (!useFallback) {
        console.warn(
          "[TimeGateKiosk][speech] failed with fr-FR, retrying with default voice",
        );
        speakMessage(text, true);
        return;
      }
      console.warn("[TimeGateKiosk][speech] failed with default voice");
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
  const [coachSignal, setCoachSignal] = useState<ScanCoachSignal>("none");
  const [statusMessage, setStatusMessage] = useState(
    "Placez votre visage dans le cadre pour lancer la vérification.",
  );
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const [stabilityProgress, setStabilityProgress] = useState(0);
  const [ovalLayout, setOvalLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const stabilityTrackerRef = useRef(new FaceStabilityTracker());
  const facePresenceRef = useRef(new FacePresenceSmoother());

  const resetToIdle = useCallback(() => {
    captureInFlight.current = false;
    stabilityTrackerRef.current.reset();
    facePresenceRef.current.reset();
    setStabilityProgress(0);
    setVerifyState("idle");
    setCoachSignal("none");
    setCapturedPhotoUri(null);
    setEmployeeName(null);
    setStatusMessage(
      "Placez votre visage dans le cadre pour lancer la vérification.",
    );
  }, []);

  const ringMode = useMemo(
    () =>
      resolveFaceRingMode({
        verifyState,
        stabilityProgress,
        coachSignal,
      }),
    [coachSignal, stabilityProgress, verifyState],
  );
  const coachMessage = useMemo(
    () => resolveCoachMessage({ verifyState, coachSignal }),
    [coachSignal, verifyState],
  );

  const runVerification = useCallback(async () => {
    if (!cameraRef.current || captureInFlight.current || verifyState === "verifying") return;

    console.log("[TimeGateKiosk][scan] live detection triggered verification");
    captureInFlight.current = true;
    let shouldAutoReset = false;
    let shouldRedirectHome = false;
    let capturedPhotoForRetry: string | null = null;

    try {
      setVerifyState("verifying");
      setCoachSignal("none");
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
        idempotencyKey: createKioskIdempotencyKey("verify-online"),
      });
      setEmployeeName(result.employeeName);
      const resultMessage = result.message?.trim()
        ? result.message
        : result.success
          ? "Pointage enregistré."
          : "Vérification échouée. Réessayez.";
      setStatusMessage(resultMessage);

      console.log("[TimeGateKiosk][scan] verification result", result);

      if (result.success) {
        setVerifyState("success");
        shouldRedirectHome = true;
        console.log("[TimeGateKiosk][scan] verification success", {
          confidence: result.confidence,
          message: result.message,
        });
        speakMessage(resultMessage);
      } else {
        setVerifyState("error");
        shouldAutoReset = true;
        speakMessage(resultMessage);
        console.warn("[TimeGateKiosk][scan] verification failed (not matched)", {
          confidence: result.confidence,
          message: resultMessage,
        });
      }
    } catch (error) {
      if (isLikelyNetworkError(error) && capturedPhotoForRetry) {
        const pending = await enqueueOfflineVerification(capturedPhotoForRetry);
        setPendingSyncCount(pending);
        setCoachSignal("offline_queued");
        setVerifyState("success");
        shouldAutoReset = true;
        setStatusMessage(
          `Mode hors ligne: capture enregistrée. Synchronisation automatique dès que le réseau revient (${pending} en attente).`,
        );
        console.warn("[TimeGateKiosk][scan] network unavailable, verification queued offline", {
          pending,
        });
      } else {
        setVerifyState("error");
        shouldAutoReset = true;
        const features = await getKioskFeatures();
        const friendlyMessage = getVerificationUserMessage(error, features);
        setStatusMessage(friendlyMessage);
        speakMessage(friendlyMessage);
        console.warn("[TimeGateKiosk][scan] verification failed", { message: friendlyMessage });
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
    let mounted = true;
    const refreshAndSync = async () => {
      if (captureInFlight.current) return;
      try {
        const result = await syncOfflineVerifications(VERIFY_TIMEOUT_SECONDS * 1000);
        if (mounted) {
          setPendingSyncCount(result.pending);
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
        logFaceCaptureDebug({
          phase: "no_face",
          graceActive: facePresenceRef.current.isLikelyPresent(),
        });
        if (facePresenceRef.current.isLikelyPresent()) {
          return;
        }
        stabilityTrackerRef.current.reset();
        facePresenceRef.current.reset();
        setStabilityProgress(0);
        setCoachSignal("no_face");
        setStatusMessage(
          "Aucun visage détecté. Placez votre visage dans le cadre ovale.",
        );
        return;
      }

      facePresenceRef.current.markPresent();
      if (detectedFaces > 1) {
        logFaceCaptureDebug({ phase: "multiple_faces", count: detectedFaces });
        stabilityTrackerRef.current.reset();
        setStabilityProgress(0);
        setCoachSignal("multiple_faces");
        setStatusMessage(
          "Plusieurs visages détectés. Une seule personne doit se présenter à la fois.",
        );
        return;
      }

      const oval = ovalBoundsRef.current;
      const face = faces[0];
      const fb = face?.bounds as
        | {
            origin: { x: number; y: number };
            size: { width: number; height: number };
          }
        | undefined;
      if (!oval || !fb) {
        stabilityTrackerRef.current.reset();
        setStabilityProgress(0);
        setCoachSignal("off_center");
        setStatusMessage("Centrez votre visage dans le cadre ovale.");
        return;
      }
      const faceCenterX = fb.origin.x + fb.size.width / 2;
      const faceCenterY = fb.origin.y + fb.size.height / 2;

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
      const faceRatio = fb.size.height / oval.height;

      if (!horizontallyCentered || !verticallyCentered) {
        logFaceCaptureDebug({
          phase: "off_center",
          face: faceToDebugSnapshot(face),
          faceCenterX,
          faceCenterY,
          horizontallyCentered,
          verticallyCentered,
          faceRatio,
        });
        stabilityTrackerRef.current.reset();
        setStabilityProgress(0);
        setCoachSignal("off_center");
        setStatusMessage(
          !horizontallyCentered
            ? "Déplacez-vous vers la gauche ou la droite pour centrer votre visage."
            : "Penchez-vous légèrement pour centrer votre visage dans le cadre.",
        );
        return;
      }

      if (faceRatio < 0.32) {
        logFaceCaptureDebug({
          phase: "too_far",
          faceRatio,
          face: faceToDebugSnapshot(face),
        });
        stabilityTrackerRef.current.reset();
        setStabilityProgress(0);
        setCoachSignal("too_far");
        setStatusMessage("Rapprochez-vous de la caméra.");
        return;
      }
      if (faceRatio > 0.85) {
        logFaceCaptureDebug({
          phase: "too_close",
          faceRatio,
          face: faceToDebugSnapshot(face),
        });
        stabilityTrackerRef.current.reset();
        setStabilityProgress(0);
        setCoachSignal("too_close");
        setStatusMessage("Éloignez-vous un peu de la caméra.");
        return;
      }

      const qualityIssue = getFaceQualityIssue(face);
      if (qualityIssue) {
        logFaceCaptureDebug({
          phase: "quality_blocked",
          issue: qualityIssue,
          face: faceToDebugSnapshot(face),
          thresholds: {
            minEyeOpen: 0.35,
            maxYaw: 25,
            maxRoll: 25,
          },
        });
        stabilityTrackerRef.current.reset();
        setStabilityProgress(0);
        setCoachSignal(qualityIssue);
        setStatusMessage(faceQualityMessage(qualityIssue));
        return;
      }

      stabilityTrackerRef.current.push(faceCenterX, faceCenterY, fb.size.height);
      const progress = stabilityTrackerRef.current.progress;
      setStabilityProgress(progress);
      const landmarksOk = hasFaceLandmarks(face);
      const stable = stabilityTrackerRef.current.isStable();

      logFaceCaptureDebug({
        phase: stable ? "ready_capture" : "stabilizing",
        face: faceToDebugSnapshot(face),
        faceRatio,
        landmarksOk,
        stabilityProgress: progress,
        stable,
        sampleCount: stabilityTrackerRef.current.sampleCount,
        qualityIssue: null,
      });

      if (!stable) {
        setCoachSignal("stabilizing");
        setStatusMessage(
          !landmarksOk && progress < 50
            ? "Visage détecté. Regardez la caméra..."
            : progress < 70
              ? "Restez immobile un instant..."
              : "Presque prêt — ne bougez plus.",
        );
        return;
      }

      setCoachSignal("capture");
      setStatusMessage("Visage stable. Capture en cours...");
      logFaceCaptureDebug(
        {
          phase: "capture_triggered",
          face: faceToDebugSnapshot(face),
          faceRatio,
          stabilityProgress: progress,
          stable: true,
          sampleCount: stabilityTrackerRef.current.sampleCount,
        },
        { force: true },
      );
      const now = Date.now();
      if (now - lastDetectionAttemptAtRef.current < LOCAL_DETECTION_COOLDOWN_MS) return;
      lastDetectionAttemptAtRef.current = now;
      stabilityTrackerRef.current.reset();
      setStabilityProgress(0);
      void runVerification();
    },
    [runVerification, verifyState],
  );

  useEffect(() => {
    if (verifyState !== "idle") return;
    const now = Date.now();
    if (now - lastDetectionAttemptAtRef.current > LOCAL_DETECTION_COOLDOWN_MS) {
      setCoachSignal("none");
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
            detectLandmarks: FaceDetectorLandmarks.all,
            runClassifications: FaceDetectorClassifications.all,
            minDetectionInterval: 180,
            tracking: true,
          }}
          onFacesDetected={processFacesDetected}
        />
      )}

      {/* Capture area definition: a centered oval. onLayout feeds the absolute
          rectangle to ovalBoundsRef so the face detection callback can
          validate that the face is inside. */}
      <CaptureStage
        onLayoutOval={(rect) => {
          ovalBoundsRef.current = rect;
          setOvalLayout(rect);
        }}
        state={verifyState}
      />

      {ovalLayout ? (
        <View
          pointerEvents="none"
          style={[
            styles.ovalOverlay,
            {
              left: ovalLayout.x,
              top: ovalLayout.y,
              width: ovalLayout.width,
              height: ovalLayout.height,
            },
          ]}
        >
          <FaceRing
            width={ovalLayout.width}
            height={ovalLayout.height}
            mode={ringMode}
            progress={stabilityProgress}
          />
        </View>
      ) : null}

      {ovalLayout ? (
        <View
          pointerEvents="none"
          style={[
            styles.coachWrap,
            { top: ovalLayout.y + ovalLayout.height + Spacing[2] },
          ]}
        >
          <CoachLabel message={coachMessage} />
        </View>
      ) : null}

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
          <Ionicons name="close" size={22} color="#FFF" />
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
        </View>
      </View>

      {/* Status dock — fixed at the bottom, never overlaps the oval. */}
      <View
        style={[
          styles.footerWrap,
          { paddingBottom: insets.bottom + Spacing[2] },
        ]}
      >
        <StatusDock
          verifyState={verifyState}
          employeeName={employeeName}
          errorMessage={verifyState === "error" ? statusMessage : null}
          pendingSyncCount={pendingSyncCount}
        />
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
  onLayoutOval,
  state,
}: {
  onLayoutOval: (rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  state: VerifyState;
}) {
  const ovalRef = useRef<View>(null);
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
      {stageSize ? (
        <OvalScrimOverlay
          width={stageSize.width}
          height={stageSize.height}
          ovalX={ovalLeft}
          ovalY={ovalTop}
          ovalWidth={finalOvalWidth}
          ovalHeight={finalOvalHeight}
          color={overlayColor}
        />
      ) : null}

      {stageSize ? (
        <View
          collapsable={false}
          style={{
            position: "absolute",
            left: ovalLeft,
            top: ovalTop,
            width: finalOvalWidth,
            height: finalOvalHeight,
          }}
          ref={ovalRef}
          onLayout={() => {
            // Face bounds are reported in the camera's viewport coordinate
            // space, so publish this oval in that same absolute space.
            ovalRef.current?.measureInWindow((x, y, width, height) => {
              onLayoutOval({ x, y, width, height });
            });
          }}
        />
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
    position: "absolute",
    left: 16,
    top: 30,
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
    textAlign: "center",
  },
  title: { color: colors.text, fontSize: 22, fontWeight: "700", textAlign: "center" },
  sub: {
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
    fontSize: 14,
  },
  /** Capture stage sits between header and footer. SVG scrim with oval cutout. */
  captureStage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: HEADER_HEIGHT,
    paddingBottom: FOOTER_HEIGHT + SPACER,
  },
  ovalOverlay: {
    position: "absolute",
  },
  coachWrap: {
    position: "absolute",
    left: Spacing[4],
    right: Spacing[4],
  },
  footerWrap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing[4],
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
