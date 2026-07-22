import type { NextAuthConfig } from 'next-auth'
import { AUTH_COOKIE_APP_ID, buildAuthCookies } from '@/lib/auth/cookies'
import { getAuthSecret } from '@/lib/auth/secret'
import { getSessionMaxAgeSeconds } from '@/lib/auth/env'

/**
 * Config partagée — compatible Edge si besoin, mais le middleware n'importe
 * plus NextAuth (évite jose/DecompressionStream sur Edge). La garde de routes
 * vit dans `middleware.ts` + layouts serveur.
 */
export const authConfig = {
  secret: getAuthSecret(),
  cookies: buildAuthCookies(AUTH_COOKIE_APP_ID),
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: getSessionMaxAgeSeconds(),
  },
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (token.user) {
        session.user = {
          ...session.user,
          id: token.user.id,
          email: token.user.email,
          firstName: token.user.firstName,
          lastName: token.user.lastName,
          name:
            [token.user.firstName, token.user.lastName].filter(Boolean).join(' ') ||
            token.user.email,
          role: token.user.role,
          companyId: token.user.companyId,
          subscriptionActive: token.user.subscriptionActive,
          subscriptionReadOnly: token.user.subscriptionReadOnly,
          subscriptionBlocked: token.user.subscriptionBlocked,
          subscriptionStatus: token.user.subscriptionStatus,
        }
      }
      if (token.accessToken) {
        session.accessToken = token.accessToken
      }
      if (token.error) {
        session.error = token.error
      }
      return session
    },
  },
  trustHost: true,
} satisfies NextAuthConfig
