import { useRouter, usePathname, useNavigation } from "expo-router";
import { View, Text, Pressable } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { Colors } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReactNode } from "react";

type AppBarProps = {
  title?: string;
  showSearch?: boolean;
  onSearchPress?: () => void;
  showNotifications?: boolean;
  onNotificationPress?: () => void;
  notificationCount?: number;
  rightAction?: ReactNode;
  /**
   * Override automatic back-button visibility. When undefined, the back
   * button is shown iff the navigation stack can go back AND the current
   * route is not one of the bottom-tab roots.
   */
  showBack?: boolean;
};

const TAB_ROOTS = new Set([
  "/",
  "/leave",
  "/shift-swaps",
  "/notifications",
]);

export function AppBar({
  title,
  showSearch = false,
  onSearchPress,
  showNotifications = true,
  onNotificationPress,
  notificationCount = 0,
  rightAction,
  showBack,
}: AppBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];

  // canGoBack() is the source of truth: on tab roots (no parent screen)
  // it returns false. On pushed screens (profile/edit, attendance, etc.) true.
  const canGoBack =
    typeof navigation?.canGoBack === "function"
      ? navigation.canGoBack()
      : false;
  const isTabRoot = TAB_ROOTS.has(pathname ?? "");
  const backVisible = showBack ?? (canGoBack && !isTabRoot);

  const openDrawer = () => {
    // Walk up the navigator tree to find the Drawer (its state.type === 'drawer')
    // and dispatch the OPEN_DRAWER action. We dispatch the action object
    // directly because DrawerActions isn't re-exported from expo-router.
    let nav: any = navigation;
    while (nav && typeof nav.getParent === "function") {
      const parent = nav.getParent();
      if (!parent) break;
      const state = parent.getState?.();
      if (state?.type === "drawer") {
        parent.dispatch({ type: "OPEN_DRAWER", target: state.key });
        return;
      }
      nav = parent;
    }
    // Fallback: try dispatching on the closest navigation directly.
    try {
      const state = (navigation as any)?.getState?.();
      if (state?.type === "drawer") {
        (navigation as any).dispatch({ type: "OPEN_DRAWER", target: state.key });
      }
    } catch {
      /* not in a drawer */
    }
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: colors.surfaceCard,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        minHeight: 60,
      }}
    >
      {/* Back button OR logo + title */}
      {backVisible ? (
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
              }}
            >
              <Ionicons name="chevron-back" size={26} color={colors.text} />
            </View>
          </Pressable>

          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: colors.text,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {title || "TimeGate"}
          </Text>
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
          <Pressable
            onPress={openDrawer}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 8,
              }}
            >
              <Ionicons name="menu-outline" size={26} color={colors.text} />
            </View>
          </Pressable>

          <Pressable onPress={() => router.push("/")}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: colors.primary,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="time" size={22} color="#ffffff" />
            </View>
          </Pressable>

          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: colors.text,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {title || "TimeGate"}
          </Text>
        </View>
      )}

      {/* Right Actions */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {showSearch && (
          <Pressable onPress={onSearchPress}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="search-outline" size={22} color={colors.text} />
            </View>
          </Pressable>
        )}

        {showNotifications && (
          <Pressable
            onPress={
              onNotificationPress || (() => router.push("/notifications"))
            }
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <Ionicons
                name="notifications-outline"
                size={22}
                color={colors.text}
              />
              {notificationCount > 0 && (
                <View
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    minWidth: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: "#ef4444",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingHorizontal: 4,
                  }}
                >
                  <Text
                    style={{
                      color: "#ffffff",
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  >
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        )}

        {/* Avatar */}
        {rightAction ? (
          <View style={{ marginLeft: 4 }}>{rightAction}</View>
        ) : !backVisible ? (
          <Pressable onPress={() => router.push("/profile")}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: colors.primary + "20",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 4,
              }}
            >
              <MaterialCommunityIcons
                name="account"
                size={20}
                color={colors.primary}
              />
            </View>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}