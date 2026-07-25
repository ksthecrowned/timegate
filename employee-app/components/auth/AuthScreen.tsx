import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type Props = {
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * Shared auth layout: safe areas + keyboard avoiding (iOS + Android).
 * Pair with `softwareKeyboardLayoutMode: "resize"` in app.json.
 */
export function AuthScreen({ children, contentStyle }: Props) {
  const theme = useTheme();
  const keyboardOffset =
    Platform.OS === "ios" ? 0 : StatusBar.currentHeight ?? 0;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.background }]}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        keyboardVerticalOffset={keyboardOffset}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, contentStyle]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthHero({
  icon,
  title,
  subtitle,
  eyebrow,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.hero}>
      <View style={[styles.iconBubble, { backgroundColor: theme.primary }]}>
        {icon}
      </View>
      {eyebrow ? (
        <Text style={[styles.eyebrow, { color: theme.primary }]}>{eyebrow}</Text>
      ) : null}
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[8],
  },
  hero: {
    alignItems: "center",
    marginBottom: Spacing[6],
  },
  iconBubble: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing[4],
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: Spacing[2],
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.4,
    textAlign: "center",
    marginBottom: Spacing[2],
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: Spacing[2],
  },
});
