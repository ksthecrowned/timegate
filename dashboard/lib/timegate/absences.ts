import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { Absence } from '@/lib/timegate/types'

export type AbsencePayload = {
  employeeId: string
  date: string
  justified?: boolean
  reason?: string
  justificationFileUrl?: string
}

export type SyncRecordsPayload = {
  from: string
  to: string
  employeeId?: string
  branchId?: string
  companyId?: string
}

export function listAbsences(params?: {
  page?: number
  limit?: number
  employeeId?: string
  branchId?: string
  from?: string
  to?: string
}) {
  return http.get<PaginatedResponse<Absence>>('/absences', { params })
}

export function createAbsence(body: AbsencePayload) {
  return http.post<Absence>('/absences', body)
}

export function getAbsence(id: string) {
  return http.get<Absence>(`/absences/${id}`)
}

export function updateAbsence(id: string, body: Partial<AbsencePayload>) {
  return http.patch<Absence>(`/absences/${id}`, body)
}

export function deleteAbsence(id: string) {
  return http.delete<{ id: string; deleted: boolean }>(`/absences/${id}`)
}

export function syncAbsences(body: SyncRecordsPayload) {
  return http.post<{ processed: number; created: number; updated: number; source: string }>(
    '/absences/sync',
    body,
  )
}
