import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { colors, Radius, Spacing } from "../../theme/colors";

type BrandProps = {
  subtitle?: string;
  size?: "sm" | "md";
};

export function Brand({ subtitle, size = "md" }: BrandProps) {
  const iconBox = size === "sm" ? 36 : 44;
  const iconSize = size === "sm" ? 20 : 24;
  const titleSize = size === "sm" ? 22 : 28;
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconBox, { width: iconBox, height: iconBox }]}>
        <Ionicons name="time" size={iconSize} color={colors.text} />
      </View>
      <View>
        <Text style={[styles.title, { fontSize: titleSize }]}>TimeGate</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: Spacing[3] },
  iconBox: {
    borderRadius: Radius.md,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.text, fontWeight: "800", letterSpacing: -0.4 },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
});
