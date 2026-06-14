import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getProvisionState, sendKioskHeartbeat } from '../lib/timegate';

const KIOSK_HEARTBEAT_MS = 90_000;

export default function RootLayout() {
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let active = true;

    const tick = async () => {
      const state = await getProvisionState();
      if (!state.hasToken) return;
      try {
        await sendKioskHeartbeat();
      } catch {
        // Background heartbeat — ignore transient network errors.
      }
    };

    void (async () => {
      const state = await getProvisionState();
      if (!active || !state.hasToken) return;
      await tick();
      timer = setInterval(() => void tick(), KIOSK_HEARTBEAT_MS);
    })();

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
