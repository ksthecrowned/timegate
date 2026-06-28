import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as SecureStore from "expo-secure-store";

import { employeeApi, TOKEN_KEY } from "@/lib/api";
import { getPushPlatform, listenFcmForeground, registerForPushNotificationsAsync } from "@/lib/push";
import * as Notifications from "expo-notifications";

const SYNC_KEY_PREFIX = "timegate_push_sync:";

export function PushNotificationSetup() {
  const syncingRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const syncPushToken = async () => {
      if (syncingRef.current || !mounted) return;
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) return;

      syncingRef.current = true;
      try {
        const pushToken = await registerForPushNotificationsAsync();
        if (!pushToken) return;

        const syncKey = `${SYNC_KEY_PREFIX}${pushToken}`;
        const already = await SecureStore.getItemAsync(syncKey);
        if (already === "1") return;

        await employeeApi.registerDevice({
          token: pushToken,
          platform: getPushPlatform(),
        });
        await SecureStore.setItemAsync(syncKey, "1");
      } catch {
        // Permissions refusées ou API indisponible — silencieux
      } finally {
        syncingRef.current = false;
      }
    };

    void syncPushToken();

    void listenFcmForeground(async (payload) => {
      if (payload.title) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: payload.title,
            body: payload.body ?? "",
            sound: true,
          },
          trigger: null,
        });
      }
    });

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void syncPushToken();
      }
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return null;
}

export async function unregisterPushOnLogout(pushToken?: string | null) {
  if (!pushToken) return;
  try {
    await employeeApi.removeDevice({ token: pushToken });
  } catch {
    // ignore
  }
  await SecureStore.deleteItemAsync(`${SYNC_KEY_PREFIX}${pushToken}`);
}
