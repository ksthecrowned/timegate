import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";

import { employeeApi, TOKEN_KEY } from "@/lib/api";
import { resolveNotificationHref } from "@/lib/notificationDeepLink";
import {
  getPushPlatform,
  listenFcmForeground,
  registerForPushNotificationsAsync,
} from "@/lib/push";

const SYNC_KEY_PREFIX = "timegate_push_sync:";

function dataFromNotification(
  content: Notifications.NotificationContent,
): Record<string, unknown> {
  const data = (content.data ?? {}) as Record<string, unknown>;
  return data;
}

export function PushNotificationSetup() {
  const router = useRouter();
  const syncingRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    let unsubFcm: (() => void) | null = null;

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

    const openFromData = (data: Record<string, unknown>) => {
      const href = resolveNotificationHref({
        type:
          (typeof data.notificationType === "string"
            ? data.notificationType
            : null) ??
          (typeof data.type === "string" ? data.type : null),
        data,
      });
      router.push(href as never);
    };

    void syncPushToken();

    void (async () => {
      unsubFcm = await listenFcmForeground(async (payload) => {
        if (!payload.title) return;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: payload.title,
            body: payload.body ?? "",
            data: payload.data ?? {},
            sound: true,
          },
          trigger: null,
        });
      });
    })();

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        openFromData(dataFromNotification(response.notification.request.content));
      },
    );

    void Notifications.getLastNotificationResponseAsync().then((last) => {
      if (!last || !mounted) return;
      openFromData(dataFromNotification(last.notification.request.content));
    });

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void syncPushToken();
      }
    });

    return () => {
      mounted = false;
      sub.remove();
      responseSub.remove();
      unsubFcm?.();
    };
  }, [router]);

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
