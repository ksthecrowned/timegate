import type { NextAuthConfig } from 'next-auth'
import { getAuthSecret } from '@/lib/auth/secret'
import { getSessionMaxAgeSeconds } from '@/lib/auth/env'
import type { TimeGateRole } from '@/lib/timegate/types'
import { operationalPathPrefixes } from '@/lib/navigation'

const roleRules: Array<{ prefix: string; roles: TimeGateRole[] }> = [
  { prefix: '/payroll-runs', roles: ['ADMIN'] },
  { prefix: '/salaries', roles: ['ADMIN'] },
  { prefix: '/system-config', roles: ['ADMIN'] },
  { prefix: '/subscriptions', roles: ['ADMIN'] },
  { prefix: '/holidays', roles: ['ADMIN'] },
  { prefix: '/departments', roles: ['ADMIN'] },
  { prefix: '/designations', roles: ['ADMIN'] },
  { prefix: '/admins', roles: ['ADMIN'] },
  { prefix: '/organization', roles: ['ADMIN'] },
]

const publicPaths = new Set(['/login', '/signup', '/activate'])

function stripTimegatePrefix(pathname: string): string {
  if (pathname === '/timegate') return '/'
  if (pathname.startsWith('/timegate/')) {
    return pathname.replace(/^\/timegate/, '') || '/'
  }
  return pathname
}

function isProtectedAppPath(pathname: string): boolean {
  if (publicPaths.has(pathname)) return false
  if (pathname === '/') return true
  return operationalPathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  ) ||
    [
      '/audit-logs',
      '/subscriptions',
      '/system-config',
      '/admins',
      '/organization',
    ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

function isRoleAllowed(pathname: string, role?: string | null): boolean {
  const rule = roleRules.find((entry) => pathname.startsWith(entry.prefix))
  if (!rule) return true
  if (!role) return false
  return rule.roles.includes(role as TimeGateRole)
}

/**
 * Config partagée (Edge-compatible) — pas d'appels fetch API ici.
 * La logique credentials vit dans `auth.ts`.
 */
export const authConfig = {
  secret: getAuthSecret(),
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
      const rawPathname = nextUrl.pathname
      const pathname = stripTimegatePrefix(rawPathname)
      const role = auth?.user?.role
      const isLoginPage = pathname === '/login'
      const isSignupPage = pathname === '/signup'
      const isActivatePage = pathname === '/activate'
      const isOldDashboardRedirect = pathname.startsWith('/dashboard')
      const isDeprecatedShiftLocations = pathname.startsWith('/shift-locations')

      if (isOldDashboardRedirect) {
        const target = pathname.replace(/^\/dashboard/, '') || '/'
        return Response.redirect(new URL(target, nextUrl))
      }

      if (isDeprecatedShiftLocations) {
        return Response.redirect(new URL('/branches', nextUrl))
      }

      if (rawPathname !== pathname) {
        return Response.redirect(new URL(pathname || '/', nextUrl))
      }

      if (isLoginPage || isSignupPage) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/', nextUrl))
        }
        return true
      }

      if (isActivatePage) {
        return isLoggedIn
      }

      if (!isProtectedAppPath(pathname)) {
        return true
      }

      if (!isLoggedIn) return false

      if (role === 'SUPER_ADMIN') {
        return false
      }

      if (!isRoleAllowed(pathname, role)) {
        return Response.redirect(new URL('/', nextUrl))
      }

      const subscriptionActive = auth?.user?.subscriptionActive
      if (subscriptionActive === false) {
        return Response.redirect(new URL('/activate', nextUrl))
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
