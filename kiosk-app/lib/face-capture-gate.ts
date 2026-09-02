import type { FaceFeature } from "react-native-face-detector-camera";

const STABLE_WINDOW_MS = 900;
const MIN_STABLE_SAMPLES = 5;
const MAX_CENTER_DRIFT_PX = 20;
const MAX_SIZE_DRIFT_RATIO = 0.1;
/** Frames sans visage tolérées avant reset (ML Kit saute des frames). */
const FACE_ABSENT_GRACE_MS = 500;
/** Yeux fermés : seulement si les deux scores sont fournis. */
const MIN_EYE_OPEN_PROBABILITY = 0.35;
const MAX_HEAD_YAW_DEG = 25;
const MAX_HEAD_ROLL_DEG = 25;

/** ML Kit renvoie parfois 0–360° au lieu de -180–180° (ex. 351° ≈ -9°). */
export function normalizeAngleDegrees(angle: number): number {
  let normalized = angle % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized < -180) normalized += 360;
  return normalized;
}

function headPoseDeviation(angle: number | undefined): number | null {
  if (angle == null || Number.isNaN(angle)) return null;
  return Math.abs(normalizeAngleDegrees(angle));
}

type StabilitySample = {
  centerX: number;
  centerY: number;
  height: number;
  at: number;
};

/** Évite le toggle « aucun visage » / « centrez » quand ML Kit rate une frame. */
export class FacePresenceSmoother {
  private lastSeenAt = 0;

  markPresent(): void {
    this.lastSeenAt = Date.now();
  }

  isLikelyPresent(): boolean {
    if (this.lastSeenAt === 0) return false;
    return Date.now() - this.lastSeenAt <= FACE_ABSENT_GRACE_MS;
  }

  reset(): void {
    this.lastSeenAt = 0;
  }
}

export class FaceStabilityTracker {
  private samples: StabilitySample[] = [];

  reset(): void {
    this.samples = [];
  }

  push(centerX: number, centerY: number, height: number): void {
    const now = Date.now();
    this.samples.push({ centerX, centerY, height, at: now });
    const cutoff = now - STABLE_WINDOW_MS;
    this.samples = this.samples.filter((s) => s.at >= cutoff);
  }

  get progress(): number {
    const sampleProgress = Math.round(
      (this.samples.length / MIN_STABLE_SAMPLES) * 70,
    );
    if (this.samples.length < MIN_STABLE_SAMPLES) {
      return Math.min(69, sampleProgress);
    }
    return this.isStable() ? 100 : Math.min(95, sampleProgress + 10);
  }

  get sampleCount(): number {
    return this.samples.length;
  }

  isStable(): boolean {
    if (this.samples.length < MIN_STABLE_SAMPLES) return false;

    const centerXs = this.samples.map((s) => s.centerX);
    const centerYs = this.samples.map((s) => s.centerY);
    const heights = this.samples.map((s) => s.height);
    const span = (values: number[]) =>
      Math.max(...values) - Math.min(...values);
    const baseHeight = heights[0] || 1;

    return (
      span(centerXs) <= MAX_CENTER_DRIFT_PX &&
      span(centerYs) <= MAX_CENTER_DRIFT_PX &&
      span(heights) / baseHeight <= MAX_SIZE_DRIFT_RATIO
    );
  }
}

export type FaceQualityIssue = "eyes_closed" | "head_pose";

/** Ne bloque pas sur landmarks absents (souvent intermittents sur Android). */
export function getFaceQualityIssue(face: FaceFeature): FaceQualityIssue | null {
  const leftEyeOpen = face.leftEyeOpenProbability;
  const rightEyeOpen = face.rightEyeOpenProbability;
  if (leftEyeOpen != null && rightEyeOpen != null) {
    if (
      leftEyeOpen < MIN_EYE_OPEN_PROBABILITY &&
      rightEyeOpen < MIN_EYE_OPEN_PROBABILITY
    ) {
      return "eyes_closed";
    }
  }

  if (
    (face.yawAngle != null &&
      headPoseDeviation(face.yawAngle)! > MAX_HEAD_YAW_DEG) ||
    (face.rollAngle != null &&
      headPoseDeviation(face.rollAngle)! > MAX_HEAD_ROLL_DEG)
  ) {
    return "head_pose";
  }

  return null;
}

export function hasFaceLandmarks(face: FaceFeature): boolean {
  return Boolean(
    face.leftEyePosition &&
    face.rightEyePosition &&
    (face.mouthPosition || face.noseBasePosition),
  );
}

export function faceQualityMessage(issue: FaceQualityIssue): string {
  switch (issue) {
    case "eyes_closed":
      return "Ouvrez les yeux et regardez la caméra.";
    case "head_pose":
      return "Tenez la tête droite face à la caméra.";
  }
}

const DEBUG_LOG_INTERVAL_MS = 400;
let lastDebugLogAt = 0;

export function faceToDebugSnapshot(face: FaceFeature) {
  const yaw = face.yawAngle ?? null;
  const roll = face.rollAngle ?? null;
  return {
    faceID: face.faceID ?? null,
    bounds: face.bounds,
    leftEyeOpen: face.leftEyeOpenProbability ?? null,
    rightEyeOpen: face.rightEyeOpenProbability ?? null,
    smiling: face.smilingProbability ?? null,
    yaw,
    roll,
    yawNorm: yaw != null ? normalizeAngleDegrees(yaw) : null,
    rollNorm: roll != null ? normalizeAngleDegrees(roll) : null,
    landmarks: {
      leftEye: Boolean(face.leftEyePosition),
      rightEye: Boolean(face.rightEyePosition),
      mouth: Boolean(face.mouthPosition),
      nose: Boolean(face.noseBasePosition),
      leftMouth: Boolean(face.leftMouthPosition),
      rightMouth: Boolean(face.rightMouthPosition),
      bottomMouth: Boolean(face.bottomMouthPosition),
    },
  };
}

/** Logs throttlés en dev — filtrer Metro : `face-gate` */
export function logFaceCaptureDebug(
  payload: Record<string, unknown>,
  options?: { force?: boolean },
): void {
  if (!__DEV__) return;
  const now = Date.now();
  if (!options?.force && now - lastDebugLogAt < DEBUG_LOG_INTERVAL_MS) return;
  lastDebugLogAt = now;
  console.log("[TimeGateKiosk][face-gate]", payload);
}
