'use client'

import { SessionProvider } from 'next-auth/react'
import { AuthSessionGuard } from '@/components/providers/AuthSessionGuard'

/**
 * Enveloppe les zones authentifiées (dashboard).
 * `refetchInterval` déclenche le callback JWT → refresh token si activé.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus>
      <AuthSessionGuard>{children}</AuthSessionGuard>
    </SessionProvider>
  )
}
