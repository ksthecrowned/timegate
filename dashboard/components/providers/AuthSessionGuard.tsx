'use client'

import { useEffect } from 'react'
import { signOut, useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { safeCallbackUrl } from '@/lib/auth/callback-url'

/**
 * Redirige vers /login si le JWT API a expiré (session.error).
 */
export function AuthSessionGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()

  useEffect(() => {
    if (
      status === 'authenticated' &&
      session?.error === 'RefreshAccessTokenError'
    ) {
      const login = new URL('/login', window.location.origin)
      login.searchParams.set('error', 'SessionExpired')
      const returnTo = safeCallbackUrl(pathname)
      if (returnTo) {
        login.searchParams.set('callbackUrl', returnTo)
      }
      void signOut({ callbackUrl: `${login.pathname}${login.search}` })
    }
  }, [session?.error, status, pathname])

  return <>{children}</>
}
