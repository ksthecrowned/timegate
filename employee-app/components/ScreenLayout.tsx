import { View, ScrollView, RefreshControl, StyleSheet } from "react-native";
import { useColorScheme } from "react-native";
import { useSegments } from "expo-router";
import { Colors, Spacing } from "@/constants/theme";
import { AppBar } from "@/components/AppBar";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { ReactNode } from "react";

type ScreenLayoutProps = {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showNotifications?: boolean;
  notificationCount?: number;
  rightAction?: ReactNode;
  showAppBar?: boolean;
  showScroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  children: ReactNode;
  contentStyle?: object;
};

export function ScreenLayout({
  title,
  subtitle,
  showBack,
  showSearch = false,
  showNotifications = true,
  notificationCount = 0,
  rightAction,
  showAppBar = true,
  showScroll = true,
  refreshing = false,
  onRefresh,
  children,
  contentStyle,
}: ScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];

  // Tab scenes already sit above the tab bar (which includes the home
  // indicator). Stack screens need the safe-area inset themselves.
  const inTabs = segments[0] === "(tabs)";
  const paddingBottom = inTabs
    ? Spacing[4]
    : insets.bottom + Spacing[4];

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
      accessibilityElementsHidden={false}
    >
      {showAppBar ? (
        <AppBar
          title={title}
          subtitle={subtitle}
          showBack={showBack}
          showSearch={showSearch}
          showNotifications={showNotifications}
          notificationCount={notificationCount}
          rightAction={rightAction}
        />
      ) : null}

      {showScroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[{ paddingBottom }, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
                accessibilityLabel="Actualiser"
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.flex}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
