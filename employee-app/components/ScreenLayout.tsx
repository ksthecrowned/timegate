import { View, Text, ScrollView, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
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
  contentStyle?: any;
};

export function ScreenLayout({
  title,
  subtitle,
  showBack = false,
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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      {showAppBar && (
        <AppBar
          title={title}
          showSearch={showSearch}
          showNotifications={showNotifications}
          notificationCount={notificationCount}
          rightAction={rightAction}
        />
      )}

      {showScroll ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            {
              // Leave space for the native tab bar (~80px on Android, ~50px on iOS)
              paddingBottom: insets.bottom + 80,
            },
            contentStyle,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            ) : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{children}</View>
      )}
    </SafeAreaView>
  );
}
