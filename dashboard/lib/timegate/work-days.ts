import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { WeekDayName, WorkDay } from '@/lib/timegate/types'

export type WorkDayPayload = {
  scheduleId: string
  day: WeekDayName
  startTime: string
  endTime: string
}

export function listWorkDays(params?: { page?: number; limit?: number; scheduleId?: string }) {
  return http.get<PaginatedResponse<WorkDay>>('/work-days', { params })
}

export function getWorkDay(id: string) {
  return http.get<WorkDay>(`/work-days/${id}`)
}

export function createWorkDay(body: WorkDayPayload) {
  return http.post<WorkDay>('/work-days', body)
}

export function updateWorkDay(id: string, body: Partial<WorkDayPayload>) {
  return http.patch<WorkDay>(`/work-days/${id}`, body)
}

export function deleteWorkDay(id: string) {
  return http.delete<{ id: string; deleted: boolean }>(`/work-days/${id}`)
}

export const WEEK_DAY_LABELS: Record<WeekDayName, string> = {
  MONDAY: 'Lundi',
  TUESDAY: 'Mardi',
  WEDNESDAY: 'Mercredi',
  THURSDAY: 'Jeudi',
  FRIDAY: 'Vendredi',
  SATURDAY: 'Samedi',
  SUNDAY: 'Dimanche',
}

export const WEEK_DAY_OPTIONS = Object.entries(WEEK_DAY_LABELS).map(([value, label]) => ({
  value,
  label,
}))
