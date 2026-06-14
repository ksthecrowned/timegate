import { HttpSessionError } from '@/lib/http/errors'

/**
 * Résout le Bearer depuis la session NextAuth.
 * - Serveur : `auth()` (RSC, Server Actions, Route Handlers)
 * - Client : `getSession()` (appels impératifs, pas de hook)
 */
export async function resolveAccessToken(): Promise<string | null | undefined> {
  if (typeof window === 'undefined') {
    const { auth } = await import('@/auth')
    const session = await auth()
    if (session?.error === 'RefreshAccessTokenError') {
      throw new HttpSessionError()
    }
    return session?.accessToken
  }

  const { getSession } = await import('next-auth/react')
  const session = await getSession()
  if (session?.error === 'RefreshAccessTokenError') {
    throw new HttpSessionError()
  }
  return session?.accessToken
}
