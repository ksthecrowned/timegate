/* eslint-disable no-undef */
importScripts('/firebase-config.js')
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging-compat.js')

if (self.FIREBASE_CONFIG?.projectId) {
  firebase.initializeApp(self.FIREBASE_CONFIG)
  const messaging = firebase.messaging()

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title ?? 'TimeGate'
    const body = payload.notification?.body ?? ''
    self.registration.showNotification(title, {
      body,
      icon: '/images/logos/timegate-icon-color.png',
      data: payload.data ?? {},
    })
  })
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    }),
  )
})
