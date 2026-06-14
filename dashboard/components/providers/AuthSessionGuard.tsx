'use client'

import { useEffect } from 'react'
import { signOut, useSession } from 'next-auth/react'

/**
 * Redirige vers /login si le JWT API a expiré (session.error).
 */
export function AuthSessionGuard({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (
      status === 'authenticated' &&
      session?.error === 'RefreshAccessTokenError'
    ) {
      void signOut({ callbackUrl: '/login?error=SessionExpired' })
    }
  }, [session?.error, status])

  return <>{children}</>
}
