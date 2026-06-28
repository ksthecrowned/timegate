import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, Radius, Spacing } from "../../theme/colors";
import { TimeGateLogo } from "../brand/TimeGateLogo";

type KioskSetupShellProps = {
  subtitle: string;
  children: ReactNode;
};

/** Mise en page type login dashboard : bandeau marque + carte formulaire claire. */
export function KioskSetupShell({ subtitle, children }: KioskSetupShellProps) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView
      edges={["top"]}
      style={[
        styles.safe,
        {
          backgroundColor: colors.bgTop,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        }
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TimeGateLogo
              variant="full"
              tone="on-dark"
              style={styles.heroLogo}
            />
            <Text style={styles.heroTagline}>
              HR Software · Time & Attendance
            </Text>
            <Text style={styles.cardSubtitle}>{subtitle}</Text>
          </View>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing[4],
  },
  hero: {
    borderRadius: Radius.xl,
    paddingVertical: Spacing[8],
    paddingHorizontal: Spacing[5],
    alignItems: "center",
    justifyContent: "center",
    minHeight: 168,
  },
  heroLogo: {
    width: 220,
    height: 72,
  },
  heroTagline: {
    marginTop: Spacing[4],
    color: "rgba(255,255,255,0.85)",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
  },
  card: {
    borderRadius: Radius.xl,
    backgroundColor: colors.surface,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[10],
    gap: Spacing[3],
  },
  cardHeader: {
    alignItems: "center",
    marginBottom: Spacing[2],
  },
  cardIcon: {
    width: 56,
    height: 56,
  },
  cardTitle: {
    marginTop: Spacing[3],
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    marginTop: Spacing[1],
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
  },
});
