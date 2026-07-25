import { Platform, PermissionsAndroid } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type PushPlatform = "IOS" | "ANDROID" | "WEB";

function resolvePlatform(): PushPlatform {
  if (Platform.OS === "ios") return "IOS";
  if (Platform.OS === "android") return "ANDROID";
  return "WEB";
}

/** FCM natif en build dev/prod ; fallback Expo Push en Expo Go. */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const fcmToken = await tryFcmToken();
  if (fcmToken) {
    return fcmToken;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "TimeGate",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const token = (await Notifications.getDevicePushTokenAsync()).data;
  return token || null;
}

async function tryFcmToken(): Promise<string | null> {
  try {
    // Dynamic require: Expo Go n'a pas le module natif RNFirebase.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {
      getMessaging,
      getToken,
      requestPermission,
      AuthorizationStatus,
    } = require("@react-native-firebase/messaging") as typeof import("@react-native-firebase/messaging");

    if (Platform.OS === "android" && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return null;
      }
    }

    const messaging = getMessaging();
    // Don't block app startup / post-login on a slow FCM handshake.
    const authStatus = await Promise.race([
      requestPermission(messaging),
      new Promise<number>((_, reject) =>
        setTimeout(() => reject(new Error("FCM permission timeout")), 4000),
      ),
    ]);
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;
    if (!enabled) {
      return null;
    }
    return await Promise.race([
      getToken(messaging),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("FCM token timeout")), 5000),
      ),
    ]);
  } catch {
    return null;
  }
}

export async function listenFcmForeground(
  handler: (payload: {
    title?: string;
    body?: string;
    data?: Record<string, unknown>;
  }) => void,
): Promise<(() => void) | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getMessaging, onMessage } =
      require("@react-native-firebase/messaging") as typeof import("@react-native-firebase/messaging");

    const messaging = getMessaging();
    return onMessage(messaging, (remoteMessage) => {
      handler({
        title: remoteMessage.notification?.title,
        body: remoteMessage.notification?.body,
        data: (remoteMessage.data ?? {}) as Record<string, unknown>,
      });
    });
  } catch {
    return null;
  }
}

export function getPushPlatform(): PushPlatform {
  return resolvePlatform();
}
