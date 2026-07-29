import { useEffect, type JSX } from "react";
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
}): JSX.Element | null {
  const rx = Math.max(0, Number.isFinite(width) ? width / 2 - STROKE : 0);
  const ry = Math.max(0, Number.isFinite(height) ? height / 2 - STROKE : 0);
  const cx = width / 2;
  const cy = height / 2;
  const calculatedPerimeter = ellipsePerimeter(rx, ry);
  const hasValidGeometry =
    rx > 0 && ry > 0 && Number.isFinite(calculatedPerimeter) && calculatedPerimeter > 0;
  const perimeter = hasValidGeometry ? calculatedPerimeter : 1;

  const opacity = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const scale = useSharedValue(1);
  const dashOffset = useSharedValue(0);

  useEffect(() => {
    opacity.value = 1;
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
      dashOffset.value = withRepeat(
        withTiming(-perimeter, { duration: 1100, easing: Easing.linear }),
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
  }, [mode, progress, perimeter, dashOffset, opacity, shakeX, scale]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: dashOffset.value,
    strokeOpacity: opacity.value,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shakeX.value },
      { scale: scale.value },
    ],
  }));

  if (!hasValidGeometry) return null;

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
          strokeDasharray={
            mode === "verifying"
              ? `${perimeter * 0.24} ${perimeter * 0.76}`
              : `${perimeter}`
          }
          animatedProps={animatedProps}
          strokeLinecap="round"
        />
      </Svg>
    </Animated.View>
  );
}
