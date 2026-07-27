import type { TimeGateRole } from '@/lib/api/types'

const ROLE_LABELS: Record<TimeGateRole, string> = {
  PLATFORM_ADMIN: 'Administrateur plateforme',
  ADMIN: 'Administrateur organisation',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employé',
}

export function getRoleLabel(role: TimeGateRole | string | null | undefined): string {
  if (!role) return 'Utilisateur'
  return ROLE_LABELS[role as TimeGateRole] ?? role
}
