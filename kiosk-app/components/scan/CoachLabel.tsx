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
