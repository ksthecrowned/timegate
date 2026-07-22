import type { NextAuthConfig } from 'next-auth'
import { AUTH_COOKIE_APP_ID, buildAuthCookies } from '@/lib/auth/cookies'
import { getAuthSecret } from '@/lib/auth/secret'
import { getSessionMaxAgeSeconds } from '@/lib/auth/env'

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
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const pathname = nextUrl.pathname
      const isLoginPage = pathname === '/login'

      if (isLoginPage) {
        if (isLoggedIn && auth?.user?.role === 'SUPER_ADMIN') {
          return Response.redirect(new URL('/', nextUrl))
        }
        if (isLoggedIn) {
          return Response.redirect(new URL('/login?error=Forbidden', nextUrl))
        }
        return true
      }

      if (!isLoggedIn) return false

      if (auth?.user?.role !== 'SUPER_ADMIN') {
        return Response.redirect(new URL('/login?error=Forbidden', nextUrl))
      }

      return true
    },
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
