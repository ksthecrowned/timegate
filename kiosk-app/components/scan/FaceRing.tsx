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
}): JSX.Element {
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
