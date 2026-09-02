import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../shared/PrimaryButton";
import { colors, Radius, Spacing } from "../../theme/colors";
import type { PunchMode } from "./punch-modes";

function ModeHero({ hero }: { hero: PunchMode["hero"] }) {
  return (
    <View style={styles.readyFaceArea}>
      <View style={[styles.readyCorner, styles.readyTopLeft]} />
      <View style={[styles.readyCorner, styles.readyTopRight]} />
      <View style={[styles.readyCorner, styles.readyBottomLeft]} />
      <View style={[styles.readyCorner, styles.readyBottomRight]} />
      {hero === "face-gif" ? (
        <View style={styles.readyGifWrap}>
          <Image
            source={require("../../assets/images/scan_loader_transparent.gif")}
            style={styles.readyGif}
            resizeMode="cover"
          />
        </View>
      ) : (
        <View style={styles.readyIconWrap}>
          <Ionicons name={hero.icon} size={hero.size} color={colors.tealLight} />
        </View>
      )}
    </View>
  );
}

export function ModeSlide({ mode }: { mode: PunchMode }) {
  return (
    <View style={styles.modeSlide}>
      <Text style={styles.readyTitle}>{mode.title}</Text>
      <Text style={styles.readySub}>{mode.subtitle}</Text>
      <ModeHero hero={mode.hero} />
      <PrimaryButton
        label={mode.buttonLabel}
        onPress={mode.onStart}
        trailingIcon={mode.trailingIcon}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  modeSlide: {
    flex: 1,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[6],
    paddingBottom: Spacing[2],
  },
  readyTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  readySub: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: Spacing[2],
    lineHeight: 22,
  },
  readyFaceArea: {
    flex: 1,
    minHeight: 220,
    marginTop: Spacing[4],
    marginBottom: Spacing[3],
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  readyGifWrap: {
    width: "85%",
    height: "70%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  readyGif: { width: "100%", height: "100%" },
  readyIconWrap: {
    width: "70%",
    aspectRatio: 1,
    maxHeight: "55%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.xl,
    borderWidth: 2,
    borderColor: "rgba(13, 148, 136, 0.45)",
    backgroundColor: "rgba(15, 23, 42, 0.55)",
  },
  readyCorner: {
    position: "absolute",
    width: 46,
    height: 46,
    borderColor: colors.info,
  },
  readyTopLeft: {
    top: "13%",
    left: "4%",
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 14,
  },
  readyTopRight: {
    top: "13%",
    right: "4%",
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 14,
  },
  readyBottomLeft: {
    bottom: "13%",
    left: "4%",
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 14,
  },
  readyBottomRight: {
    bottom: "13%",
    right: "4%",
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 14,
  },
});
