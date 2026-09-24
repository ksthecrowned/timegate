import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { EmployeeSummary } from '@/lib/timegate/types'

export type AnomalyKind = 'ATTENDANCE_EVENT' | 'PUNCH_CLAIM' | 'TIMESHEET_DAY'

export type AnomalyItem = {
  ref: string
  kind: AnomalyKind
  type: string
  status: 'OPEN' | 'RESOLVED'
  companyId: string
  employeeId: string | null
  employee?: EmployeeSummary
  workDate: string | null
  occurredAt: string | null
  title: string
  detail: string | null
  href: string
  createdAt: string
}

export type AnomalyQuery = {
  page?: number
  limit?: number
  status?: 'OPEN' | 'RESOLVED'
  kind?: AnomalyKind
}

export function listAnomalies(params?: AnomalyQuery): Promise<PaginatedResponse<AnomalyItem>> {
  return http.get<PaginatedResponse<AnomalyItem>>('/anomalies', { params })
}

export function getAnomaly(kind: string, id: string): Promise<AnomalyItem> {
  return http.get<AnomalyItem>(`/anomalies/${kind}/${id}`)
}

export function resolveAnomaly(
  kind: string,
  id: string,
  body: { decision: 'APPROVED' | 'REJECTED'; reason: string },
): Promise<unknown> {
  return http.post(`/anomalies/${kind}/${id}/resolve`, body)
}

export function parseAnomalyRef(ref: string): { kind: string; id: string } {
  const [kind, ...rest] = ref.split(':')
  return { kind, id: rest.join(':') }
}
