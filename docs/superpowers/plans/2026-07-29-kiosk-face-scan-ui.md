# Kiosk Face Scan UI (Ring & Coach) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the kiosk face-scan screen with an animated progress ring, a single coach label, and a lighter status dock — without changing capture, verify, offline, or speech behavior.

**Architecture:** Keep `scan.tsx` as orchestrator of the existing face-detection pipeline. Extract pure UI-state mapping (`scan-ui-state.ts`) and three presentational components (`FaceRing`, `CoachLabel`, `StatusDock`). Drive ring animations with `react-native-reanimated` + SVG. Remove GIF overlay, duplicate toast, and fake verifying percentage.

**Tech Stack:** Expo SDK 55, React Native 0.83, `react-native-reanimated` + `react-native-worklets` (via `expo install`), `react-native-svg`, TypeScript, Bun.

## Global Constraints

- Spec source: `docs/superpowers/specs/2026-07-29-kiosk-face-scan-ui-design.md` (approved).
- **No** API / `face-capture-gate` threshold changes (copy mapping only).
- **No** home / PIN / NFC / QR / employee enrollment work.
- Auto-reset error **10 s**, success redirect **2 s** — unchanged.
- Speech only on success / failure / critical (not every coach nudge).
- FR copy only; coach messages ≤ ~8 words.
- During `verifying`: spinning ring, **no** timeout-based % display.
- StatusDock **hidden** during idle / stabilizing.
- Commits fréquents, one commit per task.
- Do not commit `.env` / secrets.

---

## File Map

| File | Responsibility |
|------|----------------|
| `kiosk-app/package.json` / lockfile | Add `react-native-reanimated`, `react-native-worklets` |
| `kiosk-app/babel.config.js` | Keep `babel-preset-expo` (reanimated/worklets plugins default on) |
| `kiosk-app/lib/scan-ui-state.ts` | Pure map: verify/stability/signals → `FaceRingMode` + coach string |
| `kiosk-app/lib/scan-ui-state.test.ts` | Bun unit tests for mapping |
| `kiosk-app/components/scan/FaceRing.tsx` | SVG ellipse ring + Reanimated modes |
| `kiosk-app/components/scan/CoachLabel.tsx` | Single coach text under oval |
| `kiosk-app/components/scan/StatusDock.tsx` | Bottom dock: verifying / success / error / offline badge |
| `kiosk-app/components/scan/OvalScrimOverlay.tsx` | Unchanged |
| `kiosk-app/app/scan.tsx` | Wire components; remove GIF / toast / fake % |

---

### Task 1: Install Reanimated (+ worklets) for Expo 55

**Files:**
- Modify: `kiosk-app/package.json` (via `expo install`)
- Modify: `kiosk-app/bun.lock` (or lockfile present)
- Verify: `kiosk-app/babel.config.js` already uses `babel-preset-expo`

**Interfaces:**
- Produces: runnable app with `import Animated from 'react-native-reanimated'` resolving

- [ ] **Step 1: Install packages with Expo version resolution**

Run from `kiosk-app`:

```bash
bunx expo install react-native-reanimated react-native-worklets
```

Expected: packages added with SDK-compatible versions (Reanimated 4.x + matching worklets).

- [ ] **Step 2: Confirm babel preset**

`kiosk-app/babel.config.js` must remain:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
```

Do **not** manually add `react-native-reanimated/plugin` unless Expo docs for the resolved version require it — `babel-preset-expo` enables reanimated/worklets by default when the packages are installed.

- [ ] **Step 3: Doctor + typecheck smoke**

```bash
bunx expo-doctor
bun run typecheck
```

Expected: doctor passes (or only pre-existing unrelated warnings); typecheck still passes.

- [ ] **Step 4: Commit**

```bash
git add kiosk-app/package.json kiosk-app/bun.lock kiosk-app/babel.config.js
git commit -m "$(cat <<'EOF'
chore(kiosk-app): add reanimated and worklets for scan UI

EOF
)"
```

---

### Task 2: Pure UI-state mapper + Bun tests

**Files:**
- Create: `kiosk-app/lib/scan-ui-state.ts`
- Create: `kiosk-app/lib/scan-ui-state.test.ts`
- Modify: `kiosk-app/package.json` (add `"test": "bun test"` script if missing)

**Interfaces:**
- Produces:
  - `export type FaceRingMode = 'idle' | 'coaching' | 'stabilizing' | 'ready' | 'verifying' | 'success' | 'error'`
  - `export type ScanUiVerifyState = 'idle' | 'verifying' | 'success' | 'error'`
  - `export type ScanCoachSignal = 'none' | 'no_face' | 'off_center' | 'too_far' | 'too_close' | 'multiple_faces' | 'eyes_closed' | 'head_pose' | 'stabilizing' | 'capture' | 'offline_queued'`
  - `export function resolveFaceRingMode(input: { verifyState: ScanUiVerifyState; stabilityProgress: number; coachSignal: ScanCoachSignal }): FaceRingMode`
  - `export function resolveCoachMessage(input: { verifyState: ScanUiVerifyState; coachSignal: ScanCoachSignal }): string`
  - `export function shouldShowStatusDock(verifyState: ScanUiVerifyState): boolean`

- [ ] **Step 1: Write failing tests**

Create `kiosk-app/lib/scan-ui-state.test.ts`:

```typescript
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
  test("hidden for idle, shown otherwise", () => {
    expect(shouldShowStatusDock("idle")).toBe(false);
    expect(shouldShowStatusDock("verifying")).toBe(true);
    expect(shouldShowStatusDock("success")).toBe(true);
    expect(shouldShowStatusDock("error")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd kiosk-app && bun test lib/scan-ui-state.test.ts
```

Expected: FAIL (module / exports missing).

- [ ] **Step 3: Implement mapper**

Create `kiosk-app/lib/scan-ui-state.ts`:

```typescript
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

export function shouldShowStatusDock(verifyState: ScanUiVerifyState): boolean {
  return verifyState !== "idle";
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd kiosk-app && bun test lib/scan-ui-state.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Add test script (if missing) and commit**

In `kiosk-app/package.json` scripts:

```json
"test": "bun test"
```

```bash
git add kiosk-app/lib/scan-ui-state.ts kiosk-app/lib/scan-ui-state.test.ts kiosk-app/package.json
git commit -m "$(cat <<'EOF'
feat(kiosk-app): add scan UI state mapper for ring and coach

EOF
)"
```

---

### Task 3: `FaceRing` component

**Files:**
- Create: `kiosk-app/components/scan/FaceRing.tsx`

**Interfaces:**
- Consumes: `FaceRingMode` from `../../lib/scan-ui-state`
- Produces: `export function FaceRing(props: { width: number; height: number; mode: FaceRingMode; progress: number }): JSX.Element`
  - `progress` is 0–100; used only when `mode === 'stabilizing'`
  - Ring sits on the oval bounds (ellipse), stroke ~3.5 px

- [ ] **Step 1: Implement `FaceRing`**

```tsx
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Ellipse } from "react-native-svg";
import type { FaceRingMode } from "../../lib/scan-ui-state";
import { colors } from "../../theme/colors";

const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const STROKE = 3.5;

function ringColor(mode: FaceRingMode): string {
  switch (mode) {
    case "success":
      return colors.success;
    case "error":
      return colors.error;
    case "verifying":
    case "ready":
    case "stabilizing":
      return colors.tealLight;
    default:
      return colors.info;
  }
}

/** Ramanujan approx for ellipse perimeter. */
function ellipsePerimeter(rx: number, ry: number): number {
  const h = (rx - ry) ** 2 / (rx + ry) ** 2;
  return Math.PI * (rx + ry) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
}

export function FaceRing({
  width,
  height,
  mode,
  progress,
}: {
  width: number;
  height: number;
  mode: FaceRingMode;
  progress: number;
}) {
  const rx = Math.max(0, width / 2 - STROKE);
  const ry = Math.max(0, height / 2 - STROKE);
  const cx = width / 2;
  const cy = height / 2;
  const perimeter = Math.max(1, ellipsePerimeter(rx, ry));

  const opacity = useSharedValue(1);
  const rotation = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const scale = useSharedValue(1);
  const dashOffset = useSharedValue(0);

  useEffect(() => {
    opacity.value = 1;
    rotation.value = 0;
    shakeX.value = 0;
    scale.value = 1;

    if (mode === "idle" || mode === "coaching") {
      const peak = mode === "coaching" ? 1 : 0.55;
      const trough = mode === "coaching" ? 0.45 : 0.28;
      opacity.value = withRepeat(
        withSequence(
          withTiming(peak, { duration: 700 }),
          withTiming(trough, { duration: 700 }),
        ),
        -1,
        false,
      );
      dashOffset.value = 0;
      return;
    }

    if (mode === "stabilizing") {
      const clamped = Math.max(0, Math.min(100, progress)) / 100;
      dashOffset.value = withTiming(perimeter * (1 - clamped), {
        duration: 120,
      });
      return;
    }

    if (mode === "ready") {
      dashOffset.value = 0;
      scale.value = withSequence(
        withTiming(1.04, { duration: 120 }),
        withTiming(1, { duration: 120 }),
      );
      return;
    }

    if (mode === "verifying") {
      dashOffset.value = perimeter * 0.72;
      rotation.value = withRepeat(
        withTiming(360, { duration: 1100, easing: Easing.linear }),
        -1,
        false,
      );
      return;
    }

    if (mode === "success") {
      dashOffset.value = withTiming(0, { duration: 280 });
      return;
    }

    if (mode === "error") {
      dashOffset.value = 0;
      shakeX.value = withSequence(
        withTiming(-6, { duration: 40 }),
        withTiming(6, { duration: 40 }),
        withTiming(-4, { duration: 40 }),
        withTiming(4, { duration: 40 }),
        withTiming(0, { duration: 40 }),
      );
    }
  }, [mode, progress, perimeter, dashOffset, opacity, rotation, shakeX, scale]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
    strokeOpacity: opacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, containerStyle]}
    >
      <Svg width={width} height={height}>
        <AnimatedEllipse
          cx={cx}
          cy={cy}
          rx={rx}
          ry={ry}
          stroke={ringColor(mode)}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${perimeter}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd kiosk-app && bun run typecheck
```

Expected: PASS (or only errors unrelated to `FaceRing`).

- [ ] **Step 3: Commit**

```bash
git add kiosk-app/components/scan/FaceRing.tsx
git commit -m "$(cat <<'EOF'
feat(kiosk-app): add animated FaceRing for oval capture feedback

EOF
)"
```

---

### Task 4: `CoachLabel` component

**Files:**
- Create: `kiosk-app/components/scan/CoachLabel.tsx`

**Interfaces:**
- Produces: `export function CoachLabel(props: { message: string }): JSX.Element | null`
  - Returns `null` when `message` is empty
  - Soft fade on message change (Reanimated opacity 0→1, ~200 ms)

- [ ] **Step 1: Implement**

```tsx
import { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Radius, Spacing } from "../../theme/colors";

export function CoachLabel({ message }: { message: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (!message.trim()) return;
    opacity.value = 0;
    opacity.value = withTiming(1, { duration: 200 });
  }, [message, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!message.trim()) return null;

  return (
    <Animated.View style={[styles.wrap, style]} pointerEvents="none">
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    marginTop: Spacing[3],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.pill,
    backgroundColor: "rgba(2, 6, 23, 0.55)",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
cd kiosk-app && bun run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add kiosk-app/components/scan/CoachLabel.tsx
git commit -m "$(cat <<'EOF'
feat(kiosk-app): add CoachLabel under face capture oval

EOF
)"
```

---

### Task 5: `StatusDock` component

**Files:**
- Create: `kiosk-app/components/scan/StatusDock.tsx`

**Interfaces:**
- Consumes: `ScanUiVerifyState` from `../../lib/scan-ui-state`
- Produces: `export function StatusDock(props: { verifyState: ScanUiVerifyState; employeeName: string | null; errorMessage: string | null; pendingSyncCount: number }): JSX.Element | null`
  - Returns `null` when `shouldShowStatusDock(verifyState)` is false
  - verifying: label « Vérification… » — **no percentage**
  - success: « Bienvenue {employeeName} » or « Pointage enregistré »
  - error: `errorMessage` or « Échec de la vérification »
  - offline badge when `pendingSyncCount > 0`

- [ ] **Step 1: Implement**

```tsx
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import {
  shouldShowStatusDock,
  type ScanUiVerifyState,
} from "../../lib/scan-ui-state";
import { colors, Radius, Spacing } from "../../theme/colors";

export function StatusDock({
  verifyState,
  employeeName,
  errorMessage,
  pendingSyncCount,
}: {
  verifyState: ScanUiVerifyState;
  employeeName: string | null;
  errorMessage: string | null;
  pendingSyncCount: number;
}) {
  if (!shouldShowStatusDock(verifyState)) return null;

  const title =
    verifyState === "verifying"
      ? "Vérification…"
      : verifyState === "success"
        ? employeeName
          ? `Bienvenue ${employeeName}`
          : "Pointage enregistré"
        : errorMessage?.trim() || "Échec de la vérification";

  const iconName =
    verifyState === "verifying"
      ? "sync"
      : verifyState === "success"
        ? "checkmark"
        : "close";

  return (
    <View
      style={[
        styles.card,
        verifyState === "success" && styles.cardSuccess,
        verifyState === "error" && styles.cardError,
      ]}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.icon,
            verifyState === "success" && styles.iconSuccess,
            verifyState === "error" && styles.iconError,
          ]}
        >
          <Ionicons name={iconName} size={24} color="#fff" />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      {pendingSyncCount > 0 ? (
        <View style={styles.offlineBadge}>
          <Ionicons
            name="cloud-offline-outline"
            size={14}
            color={colors.warnText}
          />
          <Text style={styles.offlineText}>
            {`${pendingSyncCount} vérification(s) en attente de synchro`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    backgroundColor: "rgba(2, 6, 23, 0.78)",
    borderWidth: 1,
    borderColor: "rgba(13, 148, 136, 0.4)",
    padding: Spacing[3],
    gap: Spacing[2],
  },
  cardSuccess: {
    borderColor: colors.successBorder,
    backgroundColor: "rgba(16, 185, 129, 0.18)",
  },
  cardError: {
    borderColor: colors.errorBorder,
    backgroundColor: "rgba(239, 68, 68, 0.18)",
  },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing[3] },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  iconSuccess: { backgroundColor: colors.success },
  iconError: { backgroundColor: colors.error },
  title: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
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
  offlineText: {
    color: colors.warnText,
    fontSize: 12,
    fontWeight: "600",
  },
});
```

- [ ] **Step 2: Typecheck + commit**

```bash
cd kiosk-app && bun run typecheck
git add kiosk-app/components/scan/StatusDock.tsx
git commit -m "$(cat <<'EOF'
feat(kiosk-app): add StatusDock for verify success and error

EOF
)"
```

---

### Task 6: Wire `scan.tsx` (remove GIF / toast / fake %)

**Files:**
- Modify: `kiosk-app/app/scan.tsx`

**Interfaces:**
- Consumes: `FaceRing`, `CoachLabel`, `StatusDock`, `resolveFaceRingMode`, `resolveCoachMessage`, `ScanCoachSignal`
- Produces: screen behavior matching spec Done criteria

- [ ] **Step 1: Track `coachSignal` alongside existing status updates**

Add state near other hooks:

```tsx
const [coachSignal, setCoachSignal] = useState<ScanCoachSignal>("none");
```

In `processFacesDetected` and `resetToIdle` / `runVerification`, set `coachSignal` to the matching signal (`no_face`, `off_center`, `too_far`, `too_close`, `multiple_faces`, `eyes_closed`, `head_pose`, `stabilizing`, `capture`, `none`) instead of (or in addition to) long status strings for the UI path.

Keep `statusMessage` for **error dock** and **speech** payloads (API / `getVerificationUserMessage`), but **do not** render `MessageBox` toast.

On offline queue success path:

```tsx
setCoachSignal("offline_queued");
setVerifyState("success"); // existing
```

- [ ] **Step 2: Derive ring mode + coach message**

```tsx
const ringMode = useMemo(
  () =>
    resolveFaceRingMode({
      verifyState,
      stabilityProgress,
      coachSignal,
    }),
  [verifyState, stabilityProgress, coachSignal],
);

const coachMessage = useMemo(
  () => resolveCoachMessage({ verifyState, coachSignal }),
  [verifyState, coachSignal],
);
```

- [ ] **Step 3: Replace oval border + GIF with `FaceRing`; place `CoachLabel` under oval stage**

Inside the oval children of `CaptureStage`, remove:

- `styles.ovalBorder*` views
- `SCAN_GIF` / `Image` verifying overlay
- `feedbackOpacity` Animated toast loop + `MessageBox` under header

Add (inside oval absolute fill):

```tsx
<FaceRing
  width={/* oval width from layout — pass via CaptureStage children render-prop OR store oval size in state */}
  height={/* oval height */}
  mode={ringMode}
  progress={stabilityProgress}
/>
```

**Preferred wiring:** extend `CaptureStage` to expose oval size to children via render prop:

```tsx
children: (oval: { width: number; height: number }) => React.ReactNode
```

Then:

```tsx
<CaptureStage ...>
  {(oval) => (
    <>
      <FaceRing
        width={oval.width}
        height={oval.height}
        mode={ringMode}
        progress={stabilityProgress}
      />
    </>
  )}
</CaptureStage>
```

Place `CoachLabel` in an absolute region **just below** the oval (or as sibling under CaptureStage with top offset). Simplest approach that matches spec: wrap CaptureStage content and add coach below the stage’s oval using absolute positioning centered under `ovalTop + ovalHeight + 8`.

Practical approach in `scan.tsx`:

1. Store `ovalLayout` state `{ x, y, width, height } | null` from `onLayoutOval`.
2. Render:

```tsx
{ovalLayout ? (
  <View
    pointerEvents="none"
    style={{
      position: "absolute",
      left: ovalLayout.x,
      top: ovalLayout.y,
      width: ovalLayout.width,
      height: ovalLayout.height,
    }}
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
    style={{
      position: "absolute",
      left: Spacing[4],
      right: Spacing[4],
      top: ovalLayout.y + ovalLayout.height + Spacing[2],
    }}
  >
    <CoachLabel message={coachMessage} />
  </View>
) : null}
```

Note: `onLayoutOval` currently reports layout relative to CaptureStage; ensure coordinates are viewport-absolute (same as face bounds). If `x/y` are already camera-relative absolute, reuse them for positioning. If not, fix `onLayoutOval` to use `measureInWindow` once so ring + detection share the same space.

- [ ] **Step 4: Replace footer progress card with `StatusDock`**

```tsx
<View style={[styles.footerWrap, { paddingBottom: insets.bottom + Spacing[2] }]}>
  <StatusDock
    verifyState={verifyState}
    employeeName={employeeName}
    errorMessage={verifyState === "error" ? statusMessage : null}
    pendingSyncCount={pendingSyncCount}
  />
</View>
```

Remove `progressPercent` UI, `progressValue` %, and verifying progress card styles that encode fake %.

- [ ] **Step 5: Slim header**

Keep back button + `headerTitle` by state. **Remove** `headerSubTitle` (or stop rendering the line that duplicates coach).

- [ ] **Step 6: Delete dead code**

Remove:

- `const SCAN_GIF = require(...)`
- `feedbackOpacity` + its `useEffect`
- unused `MessageBox` import (if unused elsewhere in file)
- unused styles: `ovalBorder*`, `scanGif*`, toast wrap if unused, progress % styles

Keep permission screens and speech helpers unchanged.

- [ ] **Step 7: Typecheck + unit tests**

```bash
cd kiosk-app && bun test lib/scan-ui-state.test.ts && bun run typecheck
```

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add kiosk-app/app/scan.tsx
git commit -m "$(cat <<'EOF'
feat(kiosk-app): wire Ring & Coach face scan UI

Replace GIF border toast and fake verify percent with FaceRing, CoachLabel, and StatusDock.
EOF
)"
```

---

### Task 7: Device verification checklist + doctor

**Files:**
- None required (manual). Optional: delete unused GIF asset only if no remaining references.

- [ ] **Step 1: Grep for leftover GIF / fake %**

```bash
rg "SCAN_GIF|scan_loader|progressPercent|MessageBox" kiosk-app/app/scan.tsx
```

Expected: no matches (or MessageBox only if still used — should be none).

- [ ] **Step 2: Run doctor**

```bash
cd kiosk-app && bunx expo-doctor
```

Expected: 19/19 or all checks passed.

- [ ] **Step 3: Manual device checklist (Android tablet/kiosk)**

On device with `bun run android --device`:

1. Idle: pulse ring + coach « Placez votre visage… » ; dock hidden.
2. Off-center / too far: coaching pulse + short coach copy.
3. Stabilize: ring fills with `stabilityProgress`.
4. Capture → verifying: ring spins; coach « Vérification en cours… »; dock « Vérification… » **without %**.
5. Success: green ring + « Bienvenue {name} »; redirect ~2 s; speech fires.
6. Error: red shake + dock message; auto-reset ~10 s; speech fires.
7. Airplane mode after face stable: offline coach + pending badge; queue still works.
8. Multi-face / eyes / head pose: short coach strings; no capture.

- [ ] **Step 4: Final commit only if cleanup (e.g. unused GIF)**

If `scan_loader_transparent.gif` has zero references:

```bash
rg "scan_loader" kiosk-app
# if none:
git rm kiosk-app/assets/images/scan_loader_transparent.gif
git commit -m "$(cat <<'EOF'
chore(kiosk-app): remove unused face-scan loader GIF

EOF
)"
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| FaceRing modes + animations | Task 3 (+ mapper Task 2) |
| Remove GIF / thick border | Task 6 |
| Single CoachLabel + short FR copy | Tasks 2, 4, 6 |
| StatusDock hidden idle; no fake % | Tasks 5, 6 |
| Offline coach + badge | Tasks 2, 5, 6 |
| Speech / timeouts / pipeline unchanged | Task 6 (explicit keep) |
| Reanimated install | Task 1 |
| Manual + doctor validation | Task 7 |

No TBD placeholders. Types `FaceRingMode` / `ScanCoachSignal` consistent across tasks.
