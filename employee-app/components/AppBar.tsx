import { useEffect, useState, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, usePathname, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { MinTouchTarget, Radius, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import { employeeApi } from '@/lib/api';
import { getMeCached } from '@/lib/meCache';

type AppBarProps = {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  onSearchPress?: () => void;
  showNotifications?: boolean;
  onNotificationPress?: () => void;
  /** When omitted, unread count is loaded from the API. */
  notificationCount?: number;
  rightAction?: ReactNode;
  showBack?: boolean;
};

const TAB_ROOTS = new Set([
  '/',
  '/leave',
  '/messages',
  '/shift-swaps',
  '/notifications',
  '/plus',
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
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.65 : 1 }]}
    >
      {children}
    </Pressable>
  );
}

function initials(first?: string | null, last?: string | null): string {
  const a = first?.[0] ?? '';
  const b = last?.[0] ?? '';
  return `${a}${b}`.toUpperCase() || 'TG';
}

export function AppBar({
  title,
  subtitle,
  showSearch = false,
  onSearchPress,
  showNotifications = true,
  onNotificationPress,
  notificationCount: notificationCountProp,
  rightAction,
  showBack,
}: AppBarProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const pathname = usePathname();
  const theme = useTheme();

  const [unread, setUnread] = useState(0);
  const [avatarLetters, setAvatarLetters] = useState('TG');

  const notificationCount = notificationCountProp ?? unread;

  useEffect(() => {
    if (notificationCountProp != null) return;
    if (!showNotifications) return;
    let cancelled = false;
    void employeeApi
      .getUnreadNotificationCount()
      .then((res) => {
        if (!cancelled) setUnread(res.count ?? 0);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [notificationCountProp, showNotifications, pathname]);

  useEffect(() => {
    let cancelled = false;
    void getMeCached()
      .then((me) => {
        if (!cancelled) setAvatarLetters(initials(me.firstName, me.lastName));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const canGoBack =
    typeof navigation?.canGoBack === 'function' ? navigation.canGoBack() : false;
  const isTabRoot = TAB_ROOTS.has(pathname ?? '');
  const backVisible = showBack ?? (canGoBack && !isTabRoot);
  const displayTitle = title || STRINGS.app.name;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.background,
          borderBottomColor: theme.border,
        },
      ]}
      accessibilityRole="header"
    >
      <View style={styles.left}>
        {backVisible ? (
          <IconButton onPress={() => router.back()} label={STRINGS.a11y.back}>
            <View
              style={[styles.actionWell, { backgroundColor: theme.surface }]}
            >
              <Ionicons name="chevron-back" size={22} color={theme.text} />
            </View>
          </IconButton>
        ) : (
          <IconButton
            onPress={() => router.push('/')}
            label={STRINGS.a11y.home}
          >
            <View style={[styles.brandMark, { backgroundColor: theme.primary }]}>
              <Text style={styles.brandMarkText}>TG</Text>
            </View>
          </IconButton>
        )}

        <View style={styles.titleWrap}>
          <Text
            style={[styles.title, { color: theme.text }]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {displayTitle}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.subtitle, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.right}>
        {showSearch ? (
          <IconButton
            onPress={() => onSearchPress?.()}
            label={STRINGS.a11y.search}
          >
            <View
              style={[styles.actionWell, { backgroundColor: theme.surface }]}
            >
              <Ionicons name="search-outline" size={20} color={theme.text} />
            </View>
          </IconButton>
        ) : null}

        {showNotifications ? (
          <IconButton
            onPress={
              onNotificationPress || (() => router.push('/notifications'))
            }
            label={STRINGS.a11y.notificationsWithCount(notificationCount)}
          >
            <View
              style={[styles.actionWell, { backgroundColor: theme.surface }]}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={theme.text}
              />
              {notificationCount > 0 ? (
                <View
                  style={[styles.badge, { backgroundColor: theme.danger }]}
                  importantForAccessibility="no-hide-descendants"
                >
                  <Text style={styles.badgeText}>
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </Text>
                </View>
              ) : null}
            </View>
          </IconButton>
        ) : null}

        {rightAction ? (
          <View style={styles.rightSlot}>{rightAction}</View>
        ) : !backVisible ? (
          <IconButton
            onPress={() => router.push('/profile')}
            label={STRINGS.a11y.profile}
          >
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: theme.primary + '1F',
                  borderColor: theme.primary + '44',
                },
              ]}
            >
              <Text style={[styles.avatarText, { color: theme.primary }]}>
                {avatarLetters}
              </Text>
            </View>
          </IconButton>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 56,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: Spacing[2],
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  rightSlot: {
    marginLeft: Spacing[1],
  },
  iconBtn: {
    minWidth: MinTouchTarget,
    minHeight: MinTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  actionWell: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
    fontWeight: '500',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
