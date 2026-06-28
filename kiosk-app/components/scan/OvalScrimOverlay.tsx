import { StyleSheet } from "react-native";
import Svg, { Defs, Ellipse, Mask, Rect } from "react-native-svg";

type OvalScrimOverlayProps = {
  width: number;
  height: number;
  ovalX: number;
  ovalY: number;
  ovalWidth: number;
  ovalHeight: number;
  color: string;
};

/**
 * Scrim plein écran avec découpe ovale (SVG mask) — remplace les 4 bandes rectangulaires.
 */
export function OvalScrimOverlay({
  width,
  height,
  ovalX,
  ovalY,
  ovalWidth,
  ovalHeight,
  color,
}: OvalScrimOverlayProps) {
  const cx = ovalX + ovalWidth / 2;
  const cy = ovalY + ovalHeight / 2;
  const rx = ovalWidth / 2;
  const ry = ovalHeight / 2;

  return (
    <Svg
      width={width}
      height={height}
      style={styles.svg}
      pointerEvents="none"
    >
      <Defs>
        <Mask id="timegateOvalCutout">
          <Rect x={0} y={0} width={width} height={height} fill="white" />
          <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="black" />
        </Mask>
      </Defs>
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={color}
        mask="url(#timegateOvalCutout)"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  svg: {
    ...StyleSheet.absoluteFillObject,
  },
});
