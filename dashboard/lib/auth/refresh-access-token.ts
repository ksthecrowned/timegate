import type { JWT } from 'next-auth/jwt'
import { REFRESH_TOKEN_ERROR, TIMEGATE_AUTH_ROUTES } from '@/lib/auth/constants'
import { isRefreshEnabled } from '@/lib/auth/env'
import { getAccessTokenExpiry } from '@/lib/auth/jwt-utils'
import { getApiBaseUrl } from '@/lib/http/config'

type RefreshResponse = {
  access_token: string
  refresh_token: string
  expires_in?: number
}

/**
 * Rotate refresh token via `POST /auth/refresh` and return updated JWT fields.
 * On failure, sets `error = RefreshAccessTokenError` so the UI can force re-login.
 */
export async function refreshAccessToken(token: JWT): Promise<JWT> {
  if (!isRefreshEnabled()) {
    if (token.accessToken && token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
      return token
    }
    return { ...token, error: REFRESH_TOKEN_ERROR }
  }

  if (!token.refreshToken) {
    return { ...token, error: REFRESH_TOKEN_ERROR }
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}${TIMEGATE_AUTH_ROUTES.refresh}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: token.refreshToken }),
      cache: 'no-store',
    })

    if (!res.ok) {
      return { ...token, error: REFRESH_TOKEN_ERROR }
    }

    const data = (await res.json()) as RefreshResponse
    if (!data.access_token || !data.refresh_token) {
      return { ...token, error: REFRESH_TOKEN_ERROR }
    }

    const next: JWT = {
      ...token,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      accessTokenExpires: getAccessTokenExpiry(data.access_token),
    }
    delete next.error
    return next
  } catch {
    return { ...token, error: REFRESH_TOKEN_ERROR }
  }
}

export function shouldRefreshAccessToken(accessTokenExpires?: number): boolean {
  if (!accessTokenExpires) return false
  const buffer = Number(process.env.AUTH_REFRESH_BUFFER_SECONDS ?? 60) * 1000
  return Date.now() >= accessTokenExpires - buffer
}
