import { Colors, MinTouchTarget } from '@/constants/theme';
import { STRINGS } from '@/constants/strings';
import { openRootDrawer } from '@/lib/openDrawer';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();
  const tabBarHeight = Math.max(56, MinTouchTarget) + Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surfaceCard,
          borderTopColor: colors.border,
          height: tabBarHeight,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontWeight: '600',
          fontSize: 11,
        },
        tabBarItemStyle: {
          minHeight: MinTouchTarget,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarAccessibilityLabel: STRINGS.a11y.home,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="leave"
        options={{
          title: 'Congés',
          tabBarAccessibilityLabel: STRINGS.leave.title,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="messages"
        options={{
          title: STRINGS.messages.title,
          tabBarAccessibilityLabel: STRINGS.messages.title,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="shift-swaps"
        options={{
          title: 'Échanges',
          tabBarAccessibilityLabel: STRINGS.swaps.title,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="swap-horizontal-outline" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="plus"
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            openRootDrawer(navigation);
          },
        })}
        options={{
          title: STRINGS.more.title,
          tabBarAccessibilityLabel: STRINGS.a11y.openDrawerTab,
          tabBarButtonTestID: Platform.OS === 'android' ? 'tab-plus' : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
