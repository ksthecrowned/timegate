import { useRouter, usePathname, useNavigation } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { Colors, MinTouchTarget, Spacing } from "@/constants/theme";
import { STRINGS } from "@/constants/strings";
import { ReactNode } from "react";

type AppBarProps = {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  onSearchPress?: () => void;
  showNotifications?: boolean;
  onNotificationPress?: () => void;
  notificationCount?: number;
  rightAction?: ReactNode;
  showBack?: boolean;
};

const TAB_ROOTS = new Set([
  "/",
  "/leave",
  "/shift-swaps",
  "/notifications",
  "/plus",
]);

function IconButton({
  onPress,
  label,
  hint,
  children,
}: {
  onPress: () => void;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.65 : 1 }]}
    >
      {children}
    </Pressable>
  );
}

export function AppBar({
  title,
  subtitle,
  showSearch = false,
  onSearchPress,
  showNotifications = true,
  onNotificationPress,
  notificationCount = 0,
  rightAction,
  showBack,
}: AppBarProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const pathname = usePathname();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === "dark" ? "dark" : "light"];

  const canGoBack =
    typeof navigation?.canGoBack === "function"
      ? navigation.canGoBack()
      : false;
  const isTabRoot = TAB_ROOTS.has(pathname ?? "");
  const backVisible = showBack ?? (canGoBack && !isTabRoot);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surfaceCard,
          borderBottomColor: colors.border,
        },
      ]}
      accessibilityRole="header"
    >
      {backVisible ? (
        <View style={styles.left}>
          <IconButton
            onPress={() => router.back()}
            label={STRINGS.a11y.back}
          >
            <Ionicons name="chevron-back" size={26} color={colors.text} />
          </IconButton>
          <View style={styles.titleWrap}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {title || STRINGS.app.name}
            </Text>
            {subtitle ? (
              <Text
                style={[styles.subtitle, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.left}>
          <IconButton
            onPress={() => router.push("/")}
            label={STRINGS.a11y.home}
          >
            <View
              style={[styles.logo, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="time" size={20} color="#ffffff" />
            </View>
          </IconButton>
          <View style={styles.titleWrap}>
            <Text
              style={[styles.title, { color: colors.text }]}
              numberOfLines={1}
              accessibilityRole="header"
            >
              {title || STRINGS.app.name}
            </Text>
            {subtitle ? (
              <Text
                style={[styles.subtitle, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>
      )}

      <View style={styles.right}>
        {showSearch ? (
          <IconButton
            onPress={() => onSearchPress?.()}
            label={STRINGS.a11y.search}
          >
            <Ionicons name="search-outline" size={22} color={colors.text} />
          </IconButton>
        ) : null}

        {showNotifications ? (
          <IconButton
            onPress={
              onNotificationPress || (() => router.push("/notifications"))
            }
            label={STRINGS.a11y.notificationsWithCount(notificationCount)}
          >
            <View>
              <Ionicons
                name="notifications-outline"
                size={22}
                color={colors.text}
              />
              {notificationCount > 0 ? (
                <View
                  style={styles.badge}
                  importantForAccessibility="no-hide-descendants"
                >
                  <Text style={styles.badgeText}>
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </IconButton>
        ) : null}

        {rightAction ? (
          <View style={{ marginLeft: 4 }}>{rightAction}</View>
        ) : !backVisible ? (
          <IconButton
            onPress={() => router.push("/profile")}
            label={STRINGS.a11y.profile}
          >
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.primary + "22" },
              ]}
            >
              <MaterialCommunityIcons
                name="account"
                size={20}
                color={colors.primary}
              />
            </View>
          </IconButton>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  left: { flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 },
  right: { flexDirection: "row", alignItems: "center", gap: 2 },
  iconBtn: {
    minWidth: MinTouchTarget,
    minHeight: MinTouchTarget,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: MinTouchTarget / 2,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: { flex: 1, minWidth: 0, marginLeft: Spacing[2] },
  title: { fontSize: 18, fontWeight: "700" },
  subtitle: { fontSize: 12, marginTop: 1 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
