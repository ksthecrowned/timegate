import { sessionCookieNamesFor } from '@/lib/auth/cookies'
import type { TimeGateRole } from '@/lib/timegate/types'

const roleRules: Array<{ prefix: string; roles: TimeGateRole[] }> = [
  { prefix: '/payroll-runs', roles: ['ADMIN'] },
  { prefix: '/compensation-grid', roles: ['ADMIN'] },
  { prefix: '/system-config', roles: ['ADMIN'] },
  { prefix: '/subscriptions', roles: ['ADMIN'] },
  { prefix: '/holidays', roles: ['ADMIN'] },
  { prefix: '/departments', roles: ['ADMIN'] },
  { prefix: '/designations', roles: ['ADMIN'] },
  { prefix: '/employment-types', roles: ['ADMIN'] },
  { prefix: '/users', roles: ['ADMIN'] },
  { prefix: '/organization', roles: ['ADMIN'] },
]

export const publicPaths = new Set(['/login', '/signup', '/activate', '/privacy'])

/** Préfixes authentifiés — source unique pour middleware + garde de routes. */
export const protectedPathPrefixes = [
  '/manager',
  '/employees',
  '/branches',
  '/kiosks',
  '/departments',
  '/designations',
  '/employment-types',
  '/shift-types',
  '/shift-assignments',
  '/planning',
  '/shift-swaps',
  '/work-days',
  '/leaves',
  '/leave-types',
  '/absences',
  '/late-records',
  '/attendance',
  '/timesheets',
  '/face-recognition-logs',
  '/payroll-runs',
  '/compensation-grid',
  '/holidays',
  '/users',
  '/audit-logs',
  '/subscriptions',
  '/system-config',
  '/organization',
  '/punch-claims',
  '/profile',
  '/trusted-devices',
] as const

export const sessionCookieNames = sessionCookieNamesFor()

export function isProtectedAppPath(pathname: string): boolean {
  if (publicPaths.has(pathname)) return false
  if (pathname === '/') return true
  return protectedPathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
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
