'use client'

import { useEffect } from 'react'
import { isFirebaseWebPushConfigured, listenForegroundPush, registerWebPushToken } from '@/lib/firebase/web-push'
import { registerWebDevice } from '@/lib/timegate/notifications'

const SYNC_KEY = 'timegate_web_push_token'

export default function WebPushSetup() {
  useEffect(() => {
    if (!isFirebaseWebPushConfigured()) return

    let unsubscribe: (() => void) | null = null

    const setup = async () => {
      try {
        const token = await registerWebPushToken()
        if (!token) return

        const previous = localStorage.getItem(SYNC_KEY)
        if (previous === token) return

        await registerWebDevice(token)
        localStorage.setItem(SYNC_KEY, token)
      } catch {
        // Permission refusée ou SW indisponible
      }

      unsubscribe = await listenForegroundPush((payload) => {
        if (typeof window === 'undefined' || Notification.permission !== 'granted') return
        if (document.visibilityState === 'visible' && payload.title) {
          new Notification(payload.title, {
            body: payload.body,
            icon: '/images/logos/timegate-icon-color.png',
          })
        }
      })
    }

    void setup()

    return () => {
      unsubscribe?.()
    }
  }, [])

  return null
}
