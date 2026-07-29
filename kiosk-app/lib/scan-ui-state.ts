export type FaceRingMode =
  | "idle"
  | "coaching"
  | "stabilizing"
  | "ready"
  | "verifying"
  | "success"
  | "error";

export type ScanUiVerifyState = "idle" | "verifying" | "success" | "error";

export type ScanCoachSignal =
  | "none"
  | "no_face"
  | "off_center"
  | "too_far"
  | "too_close"
  | "multiple_faces"
  | "eyes_closed"
  | "head_pose"
  | "stabilizing"
  | "capture"
  | "offline_queued";

const COACHING_SIGNALS: ReadonlySet<ScanCoachSignal> = new Set([
  "no_face",
  "off_center",
  "too_far",
  "too_close",
  "multiple_faces",
  "eyes_closed",
  "head_pose",
]);

export function resolveFaceRingMode(input: {
  verifyState: ScanUiVerifyState;
  stabilityProgress: number;
  coachSignal: ScanCoachSignal;
}): FaceRingMode {
  if (input.verifyState === "verifying") return "verifying";
  if (input.verifyState === "success") return "success";
  if (input.verifyState === "error") return "error";

  if (input.coachSignal === "capture" || input.stabilityProgress >= 100) {
    return "ready";
  }
  if (input.coachSignal === "stabilizing" || input.stabilityProgress > 0) {
    return "stabilizing";
  }
  if (COACHING_SIGNALS.has(input.coachSignal)) return "coaching";
  return "idle";
}

export function resolveCoachMessage(input: {
  verifyState: ScanUiVerifyState;
  coachSignal: ScanCoachSignal;
}): string {
  if (input.coachSignal === "offline_queued") {
    return "Enregistré hors ligne — synchro automatique";
  }
  if (input.verifyState === "verifying") {
    return "Vérification en cours…";
  }
  if (input.verifyState === "success") {
    return "";
  }
  if (input.verifyState === "error") {
    return "";
  }

  switch (input.coachSignal) {
    case "no_face":
      return "Placez votre visage dans le cadre";
    case "off_center":
      return "Centrez votre visage";
    case "too_far":
      return "Rapprochez-vous";
    case "too_close":
      return "Éloignez-vous un peu";
    case "multiple_faces":
      return "Une seule personne à la fois";
    case "eyes_closed":
      return "Regardez la caméra";
    case "head_pose":
      return "Tenez-vous droit";
    case "stabilizing":
      return "Restez immobile…";
    case "capture":
      return "Capture…";
    case "none":
    default:
      return "Placez votre visage dans le cadre";
  }
}

export function shouldShowStatusDock(
  verifyState: ScanUiVerifyState,
  pendingSyncCount = 0,
): boolean {
  return verifyState !== "idle" || pendingSyncCount > 0;
}
