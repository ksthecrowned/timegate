import { http } from '@/lib/http'
import type { EmployeeSummary } from '@/lib/timegate/types'

export type PunchClaimType =
  | 'EARLY_DEPARTURE'
  | 'MISSED_CHECKOUT'
  | 'BREAK_NOT_TAKEN'
  | 'OTHER'

export type PunchClaimStatus = 'OPEN' | 'APPROVED' | 'REJECTED'

export type PunchClaim = {
  id: string
  companyId: string
  employeeId: string
  workDate: string
  type: PunchClaimType
  reason: string
  status: PunchClaimStatus
  timesheetDayId: string | null
  timesheetDay?: { id: string; status: string; workDate: string } | null
  reviewedByUserId: string | null
  reviewedBy?: { id: string; email: string; firstName: string | null; lastName: string | null } | null
  reviewedAt: string | null
  reviewNote: string | null
  createdAt: string
  updatedAt: string
  employee?: EmployeeSummary
}

export const PUNCH_CLAIM_TYPE_LABELS: Record<PunchClaimType, string> = {
  EARLY_DEPARTURE: 'Départ anticipé',
  MISSED_CHECKOUT: 'Oubli check-out',
  BREAK_NOT_TAKEN: 'Pause non prise',
  OTHER: 'Autre',
}

export function getPunchClaim(id: string) {
  return http.get<PunchClaim>(`/punch-claims/${id}`)
}

export function reviewPunchClaim(
  id: string,
  body: { status: 'APPROVED' | 'REJECTED'; reviewNote?: string },
) {
  return http.patch<PunchClaim>(`/punch-claims/${id}/review`, body)
}
