import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppErrorBoundary } from '../components/shared/AppErrorBoundary';
import { installGlobalErrorLogging } from '../lib/bootstrap-errors';
import {
  forceKioskLogout,
  KIOSK_ACCESS_REVOKED,
  KIOSK_SESSION_CHANGED,
  startKioskEventStream,
} from '../lib/kiosk-sse';
import { getProvisionState, sendKioskHeartbeat } from '../lib/timegate';

installGlobalErrorLogging();

const KIOSK_HEARTBEAT_MS = 90_000;

export default function RootLayout() {
  const router = useRouter();
  const stopSseRef = useRef<(() => void) | null>(null);
  const loggingOutRef = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let active = true;

    const stopSse = () => {
      stopSseRef.current?.();
      stopSseRef.current = null;
    };

    const onAccessRevoked = async (reason: string) => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;
      stopSse();
      try {
        await forceKioskLogout(reason);
        router.replace('/');
      } finally {
        loggingOutRef.current = false;
      }
    };

    const ensureSse = async () => {
      const state = await getProvisionState();
      if (!active) return;
      if (state.hasToken) {
        if (!stopSseRef.current) {
          stopSseRef.current = startKioskEventStream({
            onAccessRevoked: (reason) => {
              void onAccessRevoked(reason);
            },
          });
        }
      } else {
        stopSse();
      }
    };

    const tick = async () => {
      const state = await getProvisionState();
      if (!state.hasToken) {
        stopSse();
        return;
      }
      try {
        await sendKioskHeartbeat();
      } catch (err) {
        const status =
          err && typeof err === 'object' && 'status' in err
            ? Number((err as { status?: number }).status)
            : 0;
        if (status === 401) {
          await onAccessRevoked('heartbeat_unauthorized');
          return;
        }
        // Transient network errors — ignore.
      }
      await ensureSse();
    };

    void (async () => {
      await ensureSse();
      const state = await getProvisionState();
      if (!active || !state.hasToken) return;
      await tick();
      timer = setInterval(() => void tick(), KIOSK_HEARTBEAT_MS);
    })();

    const sessionSub = DeviceEventEmitter.addListener(
      KIOSK_SESSION_CHANGED,
      (payload: { provisioned?: boolean }) => {
        if (payload?.provisioned) {
          void ensureSse();
        } else {
          stopSse();
        }
      },
    );

    const revokedSub = DeviceEventEmitter.addListener(KIOSK_ACCESS_REVOKED, () => {
      router.replace('/');
    });

    return () => {
      active = false;
      if (timer) clearInterval(timer);
      sessionSub.remove();
      revokedSub.remove();
      stopSse();
    };
  }, [router]);

  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}
