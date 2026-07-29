import { describe, expect, test } from "bun:test";
import {
  resolveCoachMessage,
  resolveFaceRingMode,
  shouldShowStatusDock,
} from "./scan-ui-state";

describe("resolveFaceRingMode", () => {
  test("verifying wins over stability", () => {
    expect(
      resolveFaceRingMode({
        verifyState: "verifying",
        stabilityProgress: 80,
        coachSignal: "stabilizing",
      }),
    ).toBe("verifying");
  });

  test("success and error map directly", () => {
    expect(
      resolveFaceRingMode({
        verifyState: "success",
        stabilityProgress: 0,
        coachSignal: "none",
      }),
    ).toBe("success");
    expect(
      resolveFaceRingMode({
        verifyState: "error",
        stabilityProgress: 0,
        coachSignal: "none",
      }),
    ).toBe("error");
  });

  test("idle: no face → idle; coaching signals → coaching; progress → stabilizing; 100 → ready", () => {
    expect(
      resolveFaceRingMode({
        verifyState: "idle",
        stabilityProgress: 0,
        coachSignal: "none",
      }),
    ).toBe("idle");
    expect(
      resolveFaceRingMode({
        verifyState: "idle",
        stabilityProgress: 0,
        coachSignal: "off_center",
      }),
    ).toBe("coaching");
    expect(
      resolveFaceRingMode({
        verifyState: "idle",
        stabilityProgress: 40,
        coachSignal: "stabilizing",
      }),
    ).toBe("stabilizing");
    expect(
      resolveFaceRingMode({
        verifyState: "idle",
        stabilityProgress: 100,
        coachSignal: "capture",
      }),
    ).toBe("ready");
  });
});

describe("resolveCoachMessage", () => {
  test("maps short FR strings", () => {
    expect(
      resolveCoachMessage({ verifyState: "idle", coachSignal: "none" }),
    ).toBe("Placez votre visage dans le cadre");
    expect(
      resolveCoachMessage({ verifyState: "idle", coachSignal: "too_far" }),
    ).toBe("Rapprochez-vous");
    expect(
      resolveCoachMessage({ verifyState: "idle", coachSignal: "eyes_closed" }),
    ).toBe("Regardez la caméra");
    expect(
      resolveCoachMessage({ verifyState: "verifying", coachSignal: "none" }),
    ).toBe("Vérification en cours…");
    expect(
      resolveCoachMessage({
        verifyState: "success",
        coachSignal: "offline_queued",
      }),
    ).toBe("Enregistré hors ligne — synchro automatique");
  });
});

describe("shouldShowStatusDock", () => {
  test("shows the offline badge while idle and pending", () => {
    expect(shouldShowStatusDock("idle")).toBe(false);
    expect(shouldShowStatusDock("idle", 1)).toBe(true);
    expect(shouldShowStatusDock("verifying")).toBe(true);
    expect(shouldShowStatusDock("success")).toBe(true);
    expect(shouldShowStatusDock("error")).toBe(true);
  });
});
