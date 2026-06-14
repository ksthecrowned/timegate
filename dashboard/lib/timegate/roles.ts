import type { TimeGateRole } from '@/lib/timegate/types'

const ROLE_LABELS: Record<TimeGateRole, string> = {
  SUPER_ADMIN: 'Super administrateur',
  ADMIN: 'Administrateur',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employé',
}

export function getRoleLabel(role: TimeGateRole | string | null | undefined): string {
  if (!role) return 'Utilisateur'
  return ROLE_LABELS[role as TimeGateRole] ?? role
}

export function canAccess(roles: TimeGateRole[], userRole?: TimeGateRole | null): boolean {
  if (!userRole) return false
  return roles.includes(userRole)
}
