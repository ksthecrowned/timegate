import { Image, type ImageStyle, type StyleProp } from "react-native";

export type TimeGateLogoVariant = "full" | "icon";
export type TimeGateLogoTone = "on-dark" | "on-light";

const LOGO_SOURCES: Record<
  TimeGateLogoTone,
  Record<TimeGateLogoVariant, number>
> = {
  "on-dark": {
    full: require("../../assets/images/timegate-logo-full-white.png"),
    icon: require("../../assets/images/timegate-icon-white.png"),
  },
  "on-light": {
    full: require("../../assets/images/timegate-logo-full-color.png"),
    icon: require("../../assets/images/timegate-icon-color.png"),
  },
};

type TimeGateLogoProps = {
  variant?: TimeGateLogoVariant;
  tone?: TimeGateLogoTone;
  style?: StyleProp<ImageStyle>;
};

export function TimeGateLogo({
  variant = "full",
  tone = "on-dark",
  style,
}: TimeGateLogoProps) {
  return (
    <Image
      source={LOGO_SOURCES[tone][variant]}
      accessibilityLabel="TimeGate"
      resizeMode="contain"
      style={style}
    />
  );
}
