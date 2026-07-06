import type { TimeGateRole } from '@/lib/timegate/types'

export const DASHBOARD_ROLES = ['ADMIN', 'MANAGER', 'EMPLOYEE'] as const satisfies readonly TimeGateRole[]

const ROLE_LABELS: Record<TimeGateRole, string> = {
  ADMIN: 'Administrateur',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employé',
}

export function isDashboardRole(role: string | null | undefined): role is TimeGateRole {
  return !!role && (DASHBOARD_ROLES as readonly string[]).includes(role)
}

export function getRoleLabel(role: TimeGateRole | string | null | undefined): string {
  if (!role) return 'Utilisateur'
  if (!isDashboardRole(role)) return role
  return ROLE_LABELS[role]
}

export function canAccess(roles: TimeGateRole[], userRole?: TimeGateRole | null): boolean {
  if (!userRole) return false
  return roles.includes(userRole)
}
