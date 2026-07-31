'use client'

import { useEffect } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { safeCallbackUrl } from '@/lib/auth/callback-url'
import {
  clearUnauthorizedSessionLock,
  UNAUTHORIZED_SESSION_EVENT,
} from '@/lib/http/unauthorized-session'

function buildLoginCallbackUrl(pathname: string): string {
  const login = new URL('/login', window.location.origin)
  login.searchParams.set('error', 'SessionExpired')
  const returnTo = safeCallbackUrl(pathname)
  if (returnTo) {
    login.searchParams.set('callbackUrl', returnTo)
  }
  return `${login.pathname}${login.search}`
}

/**
 * Redirige vers /login si le JWT API a expiré (session.error)
 * ou si une requête authentifiée reçoit un 401.
 */
export function AuthSessionGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()

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
      void signOut({ callbackUrl: buildLoginCallbackUrl(pathname) })
    }
  }, [session?.error, status, pathname])

  useEffect(() => {
    const onUnauthorized = () => {
      void signOut({ callbackUrl: buildLoginCallbackUrl(pathname) })
    }
    window.addEventListener(UNAUTHORIZED_SESSION_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_SESSION_EVENT, onUnauthorized)
  }, [pathname])

  return <>{children}</>
}
