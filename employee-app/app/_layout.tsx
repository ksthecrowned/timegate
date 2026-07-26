import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  useRouter,
  useRootNavigationState,
} from 'expo-router';
import { AppState, useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import { Drawer } from 'expo-router/drawer';
import type { DrawerContentComponentProps } from 'expo-router/drawer';
import * as SecureStore from 'expo-secure-store';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { TOKEN_KEY } from '@/lib/api';
import { onLogout } from '@/lib/authEvents';
import { getMeCached, invalidateMeCache } from '@/lib/meCache';
import { DrawerMenu } from '@/components/DrawerMenu';
import { PushNotificationSetup } from '@/components/PushNotificationSetup';
import { QuickActionsSetup } from '@/components/QuickActionsSetup';
import { DeviceTrustOnboarding } from '@/components/DeviceTrustOnboarding';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const router = useRouter();
  const navState = useRootNavigationState();

  useEffect(() => {
    if (!navState?.key) return;
    let cancelled = false;
    const checkAuth = async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        router.replace('/login');
        if (!cancelled) setLoading(false);
        return;
      }
      // Validate the token by calling /employee/me. If it fails, the fetchApi
      // 401 handler clears the token and dispatches auth:logout.
      try {
        await getMeCached();
      } catch {
        invalidateMeCache();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [navState?.key, router]);

  // Listen for forced logouts (token expired mid-session, 401, etc.)
  useEffect(() => {
    return onLogout(() => {
      invalidateMeCache();
      router.replace('/login');
    });
  }, [router]);

  // Refresh device trust when app returns to foreground (admin may have approved).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void (async () => {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) return;
        try {
          await getMeCached({ force: true });
        } catch {
          // ignore — banner will stay until next success
        }
      })();
    });
    return () => sub.remove();
  }, []);

  if (loading) return <AnimatedSplashOverlay />;

  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <PushNotificationSetup />
      <QuickActionsSetup />
      <DeviceTrustOnboarding />
      <Drawer
        screenOptions={{
          headerShown: false,
          overlayColor: 'rgba(15, 23, 42, 0.4)',
          drawerStyle: {
            backgroundColor: colors.background,
            width: 300,
          },
          drawerType: 'front',
        }}
        drawerContent={(props: DrawerContentComponentProps) => (
          <DrawerMenu onNavigate={() => props.navigation.closeDrawer()} />
        )}
      >
        <Drawer.Screen name="(tabs)" options={{ headerShown: false }} />
        <Drawer.Screen name="(auth)" options={{ headerShown: false }} />
        <Drawer.Screen name="profile" options={{ headerShown: false }} />
        <Drawer.Screen name="profile/edit" options={{ headerShown: false }} />
        <Drawer.Screen
          name="profile/change-password"
          options={{ headerShown: false }}
        />
        <Drawer.Screen name="attendance" options={{ headerShown: false }} />
        <Drawer.Screen name="planning" options={{ headerShown: false }} />
        <Drawer.Screen
          name="leave-balances"
          options={{ headerShown: false }}
        />
        <Drawer.Screen name="leave-types" options={{ headerShown: false }} />
        <Drawer.Screen
          name="leave-request"
          options={{ headerShown: false }}
        />
        <Drawer.Screen
          name="shift-swap-request"
          options={{ headerShown: false }}
        />
        <Drawer.Screen name="qr-punch" options={{ headerShown: false }} />
        <Drawer.Screen name="break-resume" options={{ headerShown: false }} />
        <Drawer.Screen name="contracts" options={{ headerShown: false }} />
        <Drawer.Screen name="messages/new" options={{ headerShown: false }} />
        <Drawer.Screen name="messages/[id]" options={{ headerShown: false }} />
        <Drawer.Screen
          name="punch-claim-request"
          options={{ headerShown: false }}
        />
      </Drawer>
    </ThemeProvider>
  );
}