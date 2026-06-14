import type { JWT } from 'next-auth/jwt'
import { REFRESH_TOKEN_ERROR } from '@/lib/auth/constants'
import { isRefreshEnabled } from '@/lib/auth/env'

/**
 * TMGT : JWT unique (JWT_EXPIRES_IN, défaut 8h), sans endpoint refresh.
 * À expiration → session.error = RefreshAccessTokenError → reconnexion.
 */
export async function refreshAccessToken(token: JWT): Promise<JWT> {
  if (!isRefreshEnabled()) {
    if (token.accessToken && token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
      return token
    }
    return { ...token, error: REFRESH_TOKEN_ERROR }
  }

  return { ...token, error: REFRESH_TOKEN_ERROR }
}

export function shouldRefreshAccessToken(accessTokenExpires?: number): boolean {
  if (!accessTokenExpires) return false
  const buffer = Number(process.env.AUTH_REFRESH_BUFFER_SECONDS ?? 60) * 1000
  return Date.now() >= accessTokenExpires - buffer
}
