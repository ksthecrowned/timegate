import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, Radius, Spacing } from "../../theme/colors";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  variant?: "primary" | "secondary" | "danger";
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  trailingIcon,
  variant = "primary",
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;

  if (variant === "secondary") {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.secondary,
          pressed && styles.pressed,
          isDisabled && styles.disabled,
        ]}
      >
        <Text style={styles.secondaryText}>{label}</Text>
      </Pressable>
    );
  }

  if (variant === "danger") {
    return (
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.danger,
          pressed && styles.pressed,
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>{label}</Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.wrap,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      <LinearGradient
        colors={[colors.buttonStart, colors.buttonEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <View style={styles.row}>
            <Text style={styles.primaryText}>{label}</Text>
            {trailingIcon ? (
              <Ionicons
                name={trailingIcon}
                size={18}
                color="#fff"
                style={styles.trailing}
              />
            ) : null}
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: Radius.pill,
    overflow: "hidden",
  },
  gradient: {
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[6],
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing[2] },
  trailing: { marginLeft: Spacing[2] },
  pressed: { opacity: 0.92 },
  disabled: { opacity: 0.55 },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  secondary: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "transparent",
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    alignItems: "center",
  },
  secondaryText: { color: colors.text, fontWeight: "600", fontSize: 15 },
  danger: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: colors.error,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    alignItems: "center",
  },
});
