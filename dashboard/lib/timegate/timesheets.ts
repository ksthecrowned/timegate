import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { TimesheetDay, TimesheetOverride } from '@/lib/timegate/types'

export type TimesheetQuery = {
  page?: number
  limit?: number
  status?: string
  employeeId?: string
  branchId?: string
  from?: string
  to?: string
}

export type RecalculateTimesheetsPayload = {
  from: string
  to: string
  employeeId?: string
  branchId?: string
  companyId?: string
}

export type OverrideTimesheetPayload = {
  workedMinutes: number
  lateMinutes: number
  breakMinutes?: number
  overtimeMinutes?: number
  reason: string
}

export function listTimesheets(params?: TimesheetQuery) {
  return http.get<PaginatedResponse<TimesheetDay>>('/timesheets', { params })
}

export function getTimesheet(id: string) {
  return http.get<TimesheetDay>(`/timesheets/${id}`)
}

export function recalculateTimesheets(body: RecalculateTimesheetsPayload) {
  return http.post<{
    processed: number
    created: number
    updated: number
    employees: number
    days: number
    ruleVersion: string
  }>('/timesheets/recalculate', body)
}

export function overrideTimesheet(id: string, body: OverrideTimesheetPayload) {
  return http.patch<TimesheetDay>(`/timesheets/${id}/override`, body)
}

export function getTimesheetOverrides(id: string) {
  return http.get<TimesheetOverride[]>(`/timesheets/${id}/overrides`)
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h${m.toString().padStart(2, '0')}`
}
