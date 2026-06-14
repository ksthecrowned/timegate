import type { NextAuthConfig } from 'next-auth'
import { getAuthSecret } from '@/lib/auth/secret'
import { getSessionMaxAgeSeconds } from '@/lib/auth/env'
import type { TimeGateRole } from '@/lib/timegate/types'
import { operationalPathPrefixes } from '@/lib/navigation'

const roleRules: Array<{ prefix: string; roles: TimeGateRole[] }> = [
  { prefix: '/super-admin', roles: ['SUPER_ADMIN'] },
  { prefix: '/payroll-runs', roles: ['ADMIN'] },
  { prefix: '/salaries', roles: ['ADMIN'] },
  { prefix: '/system-config', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { prefix: '/subscriptions', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { prefix: '/holidays', roles: ['ADMIN'] },
  { prefix: '/departments', roles: ['ADMIN'] },
  { prefix: '/designations', roles: ['ADMIN'] },
  { prefix: '/countries', roles: ['SUPER_ADMIN'] },
  { prefix: '/cities', roles: ['SUPER_ADMIN'] },
  { prefix: '/admins', roles: ['ADMIN'] },
  { prefix: '/organization', roles: ['ADMIN'] },
]

const publicPaths = new Set(['/login', '/activate'])

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
      '/super-admin',
      '/countries',
      '/cities',
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

function isOperationalPath(pathname: string): boolean {
  return operationalPathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
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
      const pathname = nextUrl.pathname
      const isLoginPage = pathname === '/login'
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

      if (isLoginPage) {
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

      const subscriptionActive = auth?.user?.subscriptionActive
      const role = auth?.user?.role

      if (role === 'SUPER_ADMIN' && isOperationalPath(pathname)) {
        return Response.redirect(new URL('/', nextUrl))
      }

      if (!isRoleAllowed(pathname, role)) {
        return Response.redirect(new URL('/', nextUrl))
      }

      if (subscriptionActive === false && role !== 'SUPER_ADMIN') {
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
          name: token.user.email,
          role: token.user.role,
          companyId: token.user.companyId,
          subscriptionActive: token.user.subscriptionActive,
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
