import type { NextAuthConfig } from 'next-auth'

type AuthCookies = NonNullable<NextAuthConfig['cookies']>

export const AUTH_COOKIE_APP_ID = 'timegate-dashboard'

/**
 * Cookies Auth.js nommés par app — évite les collisions entre dashboard,
 * console et d'autres apps NextAuth sur le même domaine (ex. localhost).
 */
export function buildAuthCookies(appId: string = AUTH_COOKIE_APP_ID): AuthCookies {
  const secure = process.env.NODE_ENV === 'production'
  const prefix = secure ? '__Secure-' : ''
  const hostPrefix = secure ? '__Host-' : ''

  return {
    sessionToken: {
      name: `${prefix}${appId}.session-token`,
    },
    callbackUrl: {
      name: `${prefix}${appId}.callback-url`,
    },
    csrfToken: {
      name: `${hostPrefix}${appId}.csrf-token`,
    },
  }
}

export function sessionCookieNamesFor(appId: string = AUTH_COOKIE_APP_ID): readonly string[] {
  return [
    `__Secure-${appId}.session-token`,
    `${appId}.session-token`,
  ] as const
}
