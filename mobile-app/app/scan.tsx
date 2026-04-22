import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  CameraView,
  type FaceDetectionResult,
  FaceDetectorClassifications,
  FaceDetectorMode,
  useCameraPermissions,
} from "react-native-face-detector-camera";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { getProvisionState, verifyFacePhoto } from "../lib/timegate";
import { darkTheme } from "../theme/colors";

type VerifyState = "idle" | "verifying" | "success" | "error";
const VERIFY_TIMEOUT_SECONDS = 20;
const AUTO_RESET_SECONDS = 10;
const SUCCESS_REDIRECT_SECONDS = 2;
const LOCAL_DETECTION_COOLDOWN_MS = 10000;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const raw = error.message ?? "";
    const msg = raw.toLowerCase();
    if (msg.includes("no face detected")) {
      return "Aucun visage detecte. Placez bien votre visage dans le cadre.";
    }
    if (msg.includes("timeout") || msg.includes("verification trop longue")) {
      return "Verification trop longue. Verifiez votre connexion puis reessayez.";
    }
    if (msg.includes("network request failed") || msg.includes("failed to fetch")) {
      return "Impossible de joindre le serveur. Verifiez le reseau et l'adresse API.";
    }
    return raw;
  }
  return "Une erreur est survenue pendant la verification.";
}

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
        console.warn("[TimeGateMobile][speech] failed with fr-FR, retrying with default voice");
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
  const [permission, requestPermission] = useCameraPermissions();
  const [verifyState, setVerifyState] = useState<VerifyState>("idle");
  const [statusMessage, setStatusMessage] = useState(
    "Placez votre visage dans le cadre pour lancer la verification.",
  );
  const [confidence, setConfidence] = useState<number | null>(null);
  const [verifyElapsedSeconds, setVerifyElapsedSeconds] = useState(0);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const feedbackOpacity = useRef(new Animated.Value(0)).current;

  const resetToIdle = useCallback(() => {
    captureInFlight.current = false;
    setVerifyState("idle");
    setConfidence(null);
    setVerifyElapsedSeconds(0);
    setCapturedPhotoUri(null);
    setStatusMessage("Placez votre visage dans le cadre pour lancer la verification.");
  }, []);

  const verifyingMessage = useMemo(() => {
    if (verifyElapsedSeconds < 4) return "Verification en cours (capture envoyee)...";
    if (verifyElapsedSeconds < 10) return "Verification en cours (analyse du visage)...";
    return `Verification en cours (${verifyElapsedSeconds}s)...`;
  }, [verifyElapsedSeconds]);
  const topFeedbackMessage = verifyState === "verifying" ? verifyingMessage : statusMessage;
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

    try {
      setVerifyState("verifying");
      setVerifyElapsedSeconds(0);
      setStatusMessage("Visage detecte en direct. Capture et envoi au serveur...");
      const photo = await cameraRef.current.takePictureAsync({ skipProcessing: true });
      if (!photo?.uri) {
        throw new Error("Capture photo indisponible.");
      }
      console.log('photo.uri', photo.uri);
      setCapturedPhotoUri(photo.uri);

      const result = await verifyFacePhoto(photo.uri, VERIFY_TIMEOUT_SECONDS * 1000);
      setConfidence(result.confidence);
      const resultMessage = result.message?.trim()
        ? result.message
        : "Verification echouee. Veuillez reessayer.";
      setStatusMessage(resultMessage);

      if (result.success) {
        setVerifyState("success");
        shouldRedirectHome = true;
        console.log("[TimeGateMobile][scan] verification success", {
          confidence: result.confidence,
          message: result.message,
        });
        speakMessage(result.message || "Verification reussie.");
      } else {
        setVerifyState("error");
        shouldAutoReset = true;
        console.warn("[TimeGateMobile][scan] verification failed (not matched)", {
          confidence: result.confidence,
          message: resultMessage,
        });
      }
    } catch (error) {
      setVerifyState("error");
      shouldAutoReset = true;
      const friendlyMessage = getErrorMessage(error);
      setStatusMessage(friendlyMessage);
      console.error("[TimeGateMobile][scan] verification error", error);
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

  const processFacesDetected = useCallback(
    ({ faces }: FaceDetectionResult) => {
      if (verifyState !== "idle" || captureInFlight.current || !cameraRef.current) return;
      const detectedFaces = Array.isArray(faces) ? faces.length : 0;
      if (detectedFaces !== 1) {
        if (detectedFaces < 1) {
          setStatusMessage("Aucun visage detecte. Placez votre visage dans le cadre.");
        } else {
          setStatusMessage("Plusieurs visages detectes. Veuillez vous presenter seul.");
        }
        return;
      }

      setStatusMessage("Visage detecte en direct. Verification en preparation...");
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
      setStatusMessage("Placez votre visage dans le cadre pour lancer la verification.");
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
      <LinearGradient colors={[darkTheme.bgTop, darkTheme.bgBottom]} style={styles.gradient}>
        <SafeAreaView style={styles.center}>
          <ActivityIndicator color="#FFF" />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (!permission.granted) {
    return (
      <LinearGradient colors={[darkTheme.bgTop, darkTheme.bgBottom]} style={styles.gradient}>
        <SafeAreaView style={styles.center}>
          <Text style={styles.title}>Permission camera requise</Text>
          <Text style={styles.sub}>
            Autorisez la camera pour lancer la reconnaissance faciale.
          </Text>
          <Pressable style={styles.actionBtn} onPress={() => void requestPermission()}>
            <Text style={styles.actionBtnText}>Autoriser</Text>
          </Pressable>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Retour</Text>
          </Pressable>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.fullscreen}>
      {capturedPhotoUri && verifyState !== "idle" ? (
        <Image source={{ uri: capturedPhotoUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
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

      <LinearGradient
        pointerEvents="none"
        colors={["rgba(5,8,30,0.5)", "transparent", "rgba(5,8,30,0.65)"]}
        style={StyleSheet.absoluteFill}
      />

      <View pointerEvents="none" style={styles.frame}>
        <View style={styles.oval} />
      </View>

      <Animated.View pointerEvents="none" style={[styles.centerFeedbackWrap, { opacity: feedbackOpacity }]}>
        <Text style={styles.centerFeedbackText}>{topFeedbackMessage}</Text>
      </Animated.View>

      <View style={styles.overlaySafe}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable style={styles.iconBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color="#FFF" />
          </Pressable>
          <View style={{ width: 40 }} />
          <View>
            <Text style={styles.headerTitle}>Verification faciale...</Text>
            <Text style={styles.headerSubTitle}>Placez votre visage dans le cadre pour lancer la verification.</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.progressValue}>{`${progressPercent}%`}</Text>
          <Text style={styles.progressLabel}>
            {verifyState === "verifying"
              ? "Verification de votre visage..."
              : verifyState === "success"
                ? "Verification terminee"
                : verifyState === "error"
                  ? "Verification echouee"
                  : "En attente de verification"}
          </Text>
        </View>
      </View>
    </View>
  );
}

const frameColor = "rgba(255,255,255,0.9)";

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  fullscreen: { flex: 1, backgroundColor: "#020617" },
  overlaySafe: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  header: {
    paddingHorizontal: 14,
    paddingTop: 8,
    gap: 8
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  headerTitle: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
  },
  headerSubTitle: {
    color: "rgba(255,255,255,0.86)",
    textAlign: "center",
    fontSize: 16,
    lineHeight: 29,
    fontWeight: "500",
    marginBottom: 12,
  },
  title: { color: "#FFF", fontSize: 24, fontWeight: "700", textAlign: "center" },
  sub: { color: darkTheme.textMuted, textAlign: "center", marginTop: 10, lineHeight: 21 },
  frame: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  centerFeedbackWrap: {
    position: "absolute",
    left: 18,
    right: 18,
    top: "47%",
    alignItems: "center",
  },
  centerFeedbackText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  oval: {
    width: 265,
    height: 360,
    borderRadius: 150,
    borderWidth: 4,
    borderColor: "#6E80FF",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: frameColor,
  },
  topLeft: {
    top: "18%",
    left: "18%",
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: "18%",
    right: "18%",
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: "18%",
    left: "18%",
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: "18%",
    right: "18%",
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  footer: {
    minHeight: 210,
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: darkTheme.accent,
    marginBottom: 8,
  },
  confidence: {
    marginTop: 10,
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "500",
  },
  progressValue: {
    marginTop: 14,
    color: "#FFFFFF",
    fontSize: 52,
    fontWeight: "700",
    lineHeight: 60,
  },
  progressLabel: {
    marginTop: 2,
    color: "rgba(255,255,255,0.92)",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  actionBtn: {
    marginTop: 20,
    borderRadius: 999,
    backgroundColor: darkTheme.buttonStart,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  actionBtnText: { color: "#FFF", fontWeight: "700" },
  backBtn: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 8 },
  backBtnText: { color: darkTheme.textMuted },
});
