import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { AttendanceDay, AttendanceEvent } from '@/lib/timegate/types'

export type AttendanceDayQuery = {
  page?: number
  limit?: number
  branchId?: string
  employeeId?: string
  status?: string
  date?: string
  from?: string
  to?: string
}

export type AttendanceEventQuery = {
  page?: number
  limit?: number
  branchId?: string
  employeeId?: string
  kioskId?: string
  status?: string
  from?: string
  to?: string
}

export type ReviewAttendancePayload = {
  status: 'ACCEPTED' | 'REJECTED'
  reason?: string
}

export type AttendanceEventReviews = {
  event: {
    id: string
    status: string
    rejectReason?: string | null
    meta?: Record<string, unknown> | null
  }
  reviews: Array<{
    id: string
    action: string
    createdAt: string
    user?: { id: string; email: string; role?: string | null }
  }>
}

export function listAttendanceDays(
  params?: AttendanceDayQuery,
): Promise<PaginatedResponse<AttendanceDay>> {
  return http.get<PaginatedResponse<AttendanceDay>>('/attendance/days', { params })
}

export function getAttendanceDay(id: string): Promise<AttendanceDay> {
  return http.get<AttendanceDay>(`/attendance/days/${id}`)
}

export function listAttendanceEvents(
  params?: AttendanceEventQuery,
): Promise<PaginatedResponse<AttendanceEvent>> {
  return http.get<PaginatedResponse<AttendanceEvent>>('/attendance/events', { params })
}

export function getAttendanceEvent(id: string): Promise<AttendanceEvent> {
  return http.get<AttendanceEvent>(`/attendance/events/${id}`)
}

export function getAttendanceEventReviews(id: string): Promise<AttendanceEventReviews> {
  return http.get<AttendanceEventReviews>(`/attendance/events/${id}/reviews`)
}

export function reviewAttendanceEvent(
  id: string,
  body: ReviewAttendancePayload,
): Promise<AttendanceEvent> {
  return http.patch<AttendanceEvent>(`/attendance/events/${id}/review`, body)
}

export type UpdateAttendanceDayPayload = {
  status: string
  leaveTypeId?: string
  shiftId?: string
}

export type RecalculateAttendanceDaysPayload = {
  from: string
  to: string
  employeeId?: string
  branchId?: string
  companyId?: string
}

export function recalculateAttendanceDays(body: RecalculateAttendanceDaysPayload) {
  return http.post<{ processed: number; created: number; updated: number }>(
    '/attendance/days/recalculate',
    body,
  )
}

export function updateAttendanceDay(id: string, body: UpdateAttendanceDayPayload) {
  return http.patch<AttendanceDay>(`/attendance/days/${id}`, body)
}

export function exportAttendanceDays(params: AttendanceDayQuery & { from: string; to: string }) {
  return http.get<{ filename: string; csv: string }>('/attendance/days/export', {
    params: { ...params, format: 'csv' },
  })
}

export function exportAttendanceDaysPdf(params: AttendanceDayQuery & { from: string; to: string }) {
  return http.get<{
    filename: string
    contentBase64: string
    mimeType: string
    stampedAt?: string
    digestSha256?: string
  }>(
    '/attendance/days/export',
    { params: { ...params, format: 'pdf' } },
  )
}

export function downloadBase64File(contentBase64: string, filename: string, mimeType: string) {
  const bytes = Uint8Array.from(atob(contentBase64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
