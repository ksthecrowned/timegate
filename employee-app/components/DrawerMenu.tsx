import {
  Pressable,
  Alert,
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from '@expo/vector-icons';
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
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFamily?: 'Ionicons' | 'MaterialCommunityIcons' | 'FontAwesome5';
  color: string;
  href: string;
};

const menuSections: { title: string; items: MenuItem[] }[] = [
  {
    title: STRINGS.more.sectionPersonal,
    items: [
      {
        label: STRINGS.more.profile,
        description: STRINGS.more.profileDesc,
        icon: 'person-outline',
        color: '#0d9488',
        href: '/profile',
      },
      {
        label: STRINGS.profile.edit,
        description: STRINGS.more.profileDesc,
        icon: 'create-outline',
        color: '#0284c7',
        href: '/profile/edit',
      },
      {
        label: STRINGS.profile.changePassword,
        description: STRINGS.profile.changePassword,
        icon: 'lock-closed-outline',
        color: '#14b8a6',
        href: '/profile/change-password',
      },
      {
        label: STRINGS.qrPunch.title,
        description: STRINGS.qrPunch.subtitle,
        icon: 'qr-code-outline',
        color: '#6366f1',
        href: '/qr-punch',
      },
      {
        label: STRINGS.more.attendance,
        description: STRINGS.more.attendanceDesc,
        icon: 'time-outline',
        color: '#0284c7',
        href: '/attendance',
      },
      {
        label: STRINGS.contracts.title,
        description: STRINGS.contracts.menuDesc,
        icon: 'document-text-outline',
        color: '#6366f1',
        href: '/contracts',
      },
    ],
  },
  {
    title: STRINGS.more.sectionSchedule,
    items: [
      {
        label: STRINGS.more.planning,
        description: STRINGS.more.planningDesc,
        icon: 'calendar-outline',
        color: '#0d9488',
        href: '/planning',
      },
      {
        label: STRINGS.more.leaveBalances,
        description: STRINGS.more.leaveBalancesDesc,
        icon: 'pie-chart-outline',
        color: '#0284c7',
        href: '/leave-balances',
      },
      {
        label: STRINGS.more.leaveTypes,
        description: STRINGS.more.leaveTypesDesc,
        icon: 'list-outline',
        color: '#0284c7',
        href: '/leave-types',
      },
    ],
  },
];

type DrawerMenuProps = {
  /** Called by the drawer after the user picks a route so we close it. */
  onNavigate?: () => void;
};

export function DrawerMenu({ onNavigate }: DrawerMenuProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    getMeCached()
      .then((data) => setProfile(data))
      .catch(() => undefined);
  }, []);

  const go = (href: string) => {
    onNavigate?.();
    // push so the back button returns to the previous screen
    router.push(href as any);
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

  const renderIcon = (item: MenuItem) => {
    const props = { size: 22, color: item.color };
    if (item.iconFamily === 'MaterialCommunityIcons') {
      return <MaterialCommunityIcons {...props} name={item.icon as any} />;
    }
    if (item.iconFamily === 'FontAwesome5') {
      return <FontAwesome5 {...props} name={item.icon as any} />;
    }
    return <Ionicons {...props} name={item.icon} />;
  };

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      {/* User info card */}
      {profile && (
        <Pressable onPress={() => go('/profile')}>
          <View
            style={[
              styles.userCard,
              {
                backgroundColor: colors.surfaceCard,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.avatar,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text style={styles.avatarText}>
                {profile.firstName?.[0]?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {profile.firstName} {profile.lastName}
              </Text>
              <Text
                style={[styles.userEmail, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {profile.email}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textSecondary}
            />
          </View>
        </Pressable>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Spacing[4] }}
      >
        {menuSections.map((section) => (
          <View key={section.title} style={{ marginBottom: Spacing[4] }}>
            <Text
              style={[
                styles.sectionTitle,
                { color: colors.textSecondary },
              ]}
            >
              {section.title}
            </Text>

            <View
              style={[
                styles.sectionBox,
                {
                  backgroundColor: colors.surfaceCard,
                  borderColor: colors.border,
                },
              ]}
            >
              {section.items.map((item, index) => (
                <Pressable
                  key={item.label}
                  onPress={() => go(item.href)}
                  style={({ pressed }) => [
                    styles.row,
                    {
                      borderBottomColor: colors.border,
                      borderBottomWidth:
                        index < section.items.length - 1 ? 1 : 0,
                      opacity: pressed ? 0.6 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: item.color + '15' },
                    ]}
                  >
                    {renderIcon(item)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, { color: colors.text }]}>
                      {item.label}
                    </Text>
                    <Text
                      style={[
                        styles.rowDesc,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {item.description}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={colors.textSecondary}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <View
          style={[
            styles.logoutWrap,
            { paddingBottom: insets.bottom + Spacing[3] },
          ]}
        >
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutBtn,
              {
                backgroundColor: colors.surfaceCard,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={styles.logoutText}>{STRINGS.auth.logout}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing[4],
    padding: Spacing[4],
    borderRadius: 12,
    borderWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  avatarText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  userName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  userEmail: { fontSize: 13 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[2],
  },
  sectionBox: {
    marginHorizontal: Spacing[4],
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[3],
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing[3],
  },
  rowLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  rowDesc: { fontSize: 12 },
  logoutWrap: { paddingHorizontal: Spacing[4], marginTop: Spacing[2] },
  logoutBtn: {
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: Spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: Spacing[2],
  },
});

export default DrawerMenu;