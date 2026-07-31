'use client'

import { useEffect } from 'react'
import { signOut, useSession } from 'next-auth/react'
import {
  clearUnauthorizedSessionLock,
  UNAUTHORIZED_SESSION_EVENT,
} from '@/lib/http/unauthorized-session'

/**
 * Redirige vers /login si le JWT API a expiré (session.error)
 * ou si une requête authentifiée reçoit un 401.
 */
export function AuthSessionGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'authenticated' && !session?.error) {
      clearUnauthorizedSessionLock()
    }
  }, [session?.error, status])

  useEffect(() => {
    if (
      status === 'authenticated' &&
      session?.error === 'RefreshAccessTokenError'
    ) {
      void signOut({ callbackUrl: '/login?error=SessionExpired' })
    }
  }, [session?.error, status])

  useEffect(() => {
    const onUnauthorized = () => {
      void signOut({ callbackUrl: '/login?error=SessionExpired' })
    }
    window.addEventListener(UNAUTHORIZED_SESSION_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_SESSION_EVENT, onUnauthorized)
  }, [])

  return <>{children}</>
}
