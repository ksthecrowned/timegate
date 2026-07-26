import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/timegate/types'

export type ScheduleDayException = {
  id: string
  companyId: string
  shiftTypeId: string
  workDate: string
  isOff: boolean
  startTime: string | null
  endTime: string | null
  note: string | null
  createdAt: string
  updatedAt: string
  shiftType?: { id: string; name: string } | null
}

export type ScheduleDayExceptionPayload = {
  shiftTypeId: string
  workDate: string
  isOff?: boolean
  startTime?: string
  endTime?: string
  note?: string
}

export function listScheduleDayExceptions(params?: {
  page?: number
  limit?: number
  shiftTypeId?: string
  from?: string
  to?: string
}) {
  return http.get<PaginatedResponse<ScheduleDayException>>('/schedule-day-exceptions', { params })
}

export function getScheduleDayException(id: string) {
  return http.get<ScheduleDayException>(`/schedule-day-exceptions/${id}`)
}

export function createScheduleDayException(body: ScheduleDayExceptionPayload) {
  return http.post<ScheduleDayException>('/schedule-day-exceptions', body)
}

export function updateScheduleDayException(
  id: string,
  body: Partial<ScheduleDayExceptionPayload>,
) {
  return http.patch<ScheduleDayException>(`/schedule-day-exceptions/${id}`, body)
}

export function deleteScheduleDayException(id: string) {
  return http.delete<{ id: string; deleted: boolean }>(`/schedule-day-exceptions/${id}`)
}
