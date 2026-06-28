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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messagingModule = require("@react-native-firebase/messaging");
    const messaging = messagingModule.default as {
      (): {
        requestPermission: () => Promise<number>;
        getToken: () => Promise<string>;
        onMessage: (handler: (msg: { notification?: { title?: string; body?: string } }) => void) => () => void;
      };
    };

    if (Platform.OS === "android" && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return null;
      }
    }

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messagingModule.AuthorizationStatus?.AUTHORIZED ||
      authStatus === messagingModule.AuthorizationStatus?.PROVISIONAL ||
      authStatus === 1 ||
      authStatus === 2;
    if (!enabled) {
      return null;
    }
    return await messaging().getToken();
  } catch {
    return null;
  }
}

export async function listenFcmForeground(
  handler: (payload: { title?: string; body?: string }) => void,
): Promise<(() => void) | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const messagingModule = require("@react-native-firebase/messaging");
    const messaging = messagingModule.default();
    return messaging.onMessage((remoteMessage: { notification?: { title?: string; body?: string } }) => {
      handler({
        title: remoteMessage.notification?.title,
        body: remoteMessage.notification?.body,
      });
    });
  } catch {
    return null;
  }
}

export function getPushPlatform(): PushPlatform {
  return resolvePlatform();
}
