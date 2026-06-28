import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from 'firebase/messaging'

export function getFirebaseConfig() {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
  }
}

export function isFirebaseWebPushConfigured(): boolean {
  const config = getFirebaseConfig()
  return Boolean(
    config.apiKey &&
      config.projectId &&
      config.messagingSenderId &&
      config.appId &&
      process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  )
}

let app: FirebaseApp | null = null
let messaging: Messaging | null = null

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') return null
  if (!(await isSupported())) return null
  if (!isFirebaseWebPushConfigured()) return null

  if (!app) {
    const config = getFirebaseConfig()
    app = getApps().length > 0 ? getApp() : initializeApp(config)
  }
  if (!messaging) {
    messaging = getMessaging(app)
  }
  return messaging
}

export async function registerWebPushToken(): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) return null
  if (!isFirebaseWebPushConfigured()) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  const messagingInstance = await getFirebaseMessaging()
  if (!messagingInstance) return null

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY!
  return getToken(messagingInstance, { vapidKey, serviceWorkerRegistration: registration })
}

export async function listenForegroundPush(
  handler: (payload: { title?: string; body?: string }) => void,
): Promise<(() => void) | null> {
  const messagingInstance = await getFirebaseMessaging()
  if (!messagingInstance) return null

  return onMessage(messagingInstance, (payload) => {
    handler({
      title: payload.notification?.title,
      body: payload.notification?.body,
    })
  })
}
