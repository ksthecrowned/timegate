import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { LateRecord } from '@/lib/timegate/types'
import type { SyncRecordsPayload } from '@/lib/timegate/absences'

export type LateRecordPayload = {
  employeeId: string
  date: string
  latenessMinutes: number
  justified?: boolean
  reason?: string
  justificationFileUrl?: string
}

export function listLateRecords(params?: {
  page?: number
  limit?: number
  employeeId?: string
  branchId?: string
  from?: string
  to?: string
}) {
  return http.get<PaginatedResponse<LateRecord>>('/late-records', { params })
}

export function createLateRecord(body: LateRecordPayload) {
  return http.post<LateRecord>('/late-records', body)
}

export function getLateRecord(id: string) {
  return http.get<LateRecord>(`/late-records/${id}`)
}

export function updateLateRecord(id: string, body: Partial<LateRecordPayload>) {
  return http.patch<LateRecord>(`/late-records/${id}`, body)
}

export function deleteLateRecord(id: string) {
  return http.delete<{ id: string; deleted: boolean }>(`/late-records/${id}`)
}

export function syncLateRecords(body: SyncRecordsPayload) {
  return http.post<{ processed: number; created: number; updated: number; source: string }>(
    '/late-records/sync',
    body,
  )
}

export function uploadLateJustification(employeeId: string, file: File) {
  const body = new FormData()
  body.append('employeeId', employeeId)
  body.append('file', file)
  return http.post<{ url: string }>('/late-records/upload-justification', body)
}
