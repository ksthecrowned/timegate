import {
  Pressable,
  Alert,
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import { Colors, Spacing } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { removeToken } from '@/lib/api';
import { dispatchLogout } from '@/lib/authEvents';
import { getMeCached } from '@/lib/meCache';
import { useEffect, useState } from 'react';
import type { Profile } from '@/lib/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type MenuItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
};

const menuSections: { title: string; items: MenuItem[] }[] = [
  {
    title: STRINGS.more.sectionActions,
    items: [
      {
        label: STRINGS.qrPunch.title,
        icon: 'qr-code-outline',
        href: '/qr-punch',
      },
      {
        label: STRINGS.more.breakResume,
        icon: 'cafe-outline',
        href: '/break-resume',
      },
      {
        label: STRINGS.more.attendance,
        icon: 'time-outline',
        href: '/attendance',
      },
    ],
  },
  {
    title: STRINGS.more.sectionSchedule,
    items: [
      {
        label: STRINGS.more.planning,
        icon: 'calendar-outline',
        href: '/planning',
      },
      {
        label: STRINGS.more.leaveBalances,
        icon: 'pie-chart-outline',
        href: '/leave-balances',
      },
      {
        label: STRINGS.more.leaveTypes,
        icon: 'list-outline',
        href: '/leave-types',
      },
      {
        label: STRINGS.contracts.title,
        icon: 'document-text-outline',
        href: '/contracts',
      },
    ],
  },
  {
    title: STRINGS.more.sectionPersonal,
    items: [
      {
        label: STRINGS.more.profile,
        icon: 'person-outline',
        href: '/profile',
      },
      {
        label: STRINGS.profile.edit,
        icon: 'create-outline',
        href: '/profile/edit',
      },
      {
        label: STRINGS.profile.changePassword,
        icon: 'lock-closed-outline',
        href: '/profile/change-password',
      },
    ],
  },
];

type DrawerMenuProps = {
  onNavigate?: () => void;
};

function initials(profile: Profile): string {
  const a = profile.firstName?.[0] ?? '';
  const b = profile.lastName?.[0] ?? '';
  return `${a}${b}`.toUpperCase() || 'TG';
}

export function DrawerMenu({ onNavigate }: DrawerMenuProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    getMeCached()
      .then(setProfile)
      .catch(() => undefined);
  }, []);

  const go = (href: string) => {
    onNavigate?.();
    router.push(href as never);
  };

  const handleLogout = () => {
    Alert.alert(STRINGS.auth.logout, STRINGS.auth.logoutConfirm, [
      { text: STRINGS.app.cancel, style: 'cancel' },
      {
        text: STRINGS.auth.logout,
        style: 'destructive',
        onPress: async () => {
          onNavigate?.();
          await removeToken().catch(() => undefined);
          dispatchLogout();
        },
      },
    ]);
  };

  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top + Spacing[2],
        },
      ]}
    >
      <Pressable
        onPress={() => go('/profile')}
        accessibilityRole="button"
        accessibilityLabel={STRINGS.a11y.profile}
        style={({ pressed }) => [
          styles.profileRow,
          {
            borderBottomColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {profile ? initials(profile) : '…'}
          </Text>
        </View>
        <View style={styles.profileText}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {profile
              ? `${profile.firstName} ${profile.lastName}`.trim()
              : STRINGS.app.loading}
          </Text>
          <Text
            style={[styles.email, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {profile?.email ?? ' '}
          </Text>
        </View>
      </Pressable>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {menuSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
              {section.title}
            </Text>
            {section.items.map((item) => (
              <Pressable
                key={item.href}
                onPress={() => go(item.href)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={({ pressed }) => [
                  styles.item,
                  {
                    backgroundColor: pressed ? colors.surfaceMuted : 'transparent',
                  },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={colors.textSecondary}
                  style={styles.itemIcon}
                />
                <Text style={[styles.itemLabel, { color: colors.text }]}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, Spacing[3]),
          },
        ]}
      >
        <Pressable
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel={STRINGS.a11y.logout}
          style={({ pressed }) => [
            styles.logout,
            { opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutLabel}>{STRINGS.auth.logout}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  profileText: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: '600' },
  email: { fontSize: 13, marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { paddingTop: Spacing[3], paddingBottom: Spacing[4] },
  section: { marginBottom: Spacing[4] },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[2],
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
  },
  itemIcon: { width: 28, marginRight: Spacing[3] },
  itemLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[3],
  },
  logout: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[2],
    gap: Spacing[3],
  },
  logoutLabel: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DrawerMenu;
