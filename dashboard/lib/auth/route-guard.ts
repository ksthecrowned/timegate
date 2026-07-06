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

export const publicPaths = new Set(['/login', '/signup', '/activate'])

export const sessionCookieNames = [
  '__Secure-authjs.session-token',
  '__Host-authjs.session-token',
  'authjs.session-token',
] as const

export function stripTimegatePrefix(pathname: string): string {
  if (pathname === '/timegate') return '/'
  if (pathname.startsWith('/timegate/')) {
    return pathname.replace(/^\/timegate/, '') || '/'
  }
  return pathname
}

export function isProtectedAppPath(pathname: string): boolean {
  if (publicPaths.has(pathname)) return false
  if (pathname === '/') return true
  return (
    operationalPathPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ) ||
    [
      '/audit-logs',
      '/subscriptions',
      '/system-config',
      '/admins',
      '/organization',
    ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  )
}

export function isRoleAllowedForPathname(
  pathname: string,
  role?: TimeGateRole | null,
): boolean {
  const rule = roleRules.find((entry) => pathname.startsWith(entry.prefix))
  if (!rule) return true
  if (!role) return false
  return rule.roles.includes(role)
}
