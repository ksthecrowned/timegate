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

const ANOMALY_LABELS: Record<string, string> = {
  UNCLOSED_CHECKIN: 'Sortie manquante',
  CHECKOUT_INFERRED: 'Sortie estimée',
  UNCLOSED_BREAK: 'Pause non clôturée',
  BREAK_OVERRUN: 'Pause dépassée',
  INSUFFICIENT_REST: 'Repos insuffisant',
  OVERTIME_THRESHOLD: 'Heures supp. élevées',
  HOLIDAY: 'Jour férié',
}

export function parseTimesheetAnomalyFlags(
  value: string[] | { flags?: string[] } | null | undefined,
): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (Array.isArray(value.flags)) return value.flags.map(String).filter(Boolean)
  return []
}

export function formatTimesheetAnomalyLabel(flag: string): string {
  return ANOMALY_LABELS[flag] ?? flag
}

/** Motif lisible si la feuille n’est pas fermée (anomalies / en cours / à valider). */
export function timesheetStatusReason(row: {
  status: string
  anomalyFlags?: string[] | { flags?: string[] } | null
}): string {
  const flags = parseTimesheetAnomalyFlags(row.anomalyFlags)
  if (flags.length > 0) {
    return flags.map(formatTimesheetAnomalyLabel).join(' · ')
  }
  if (row.status === 'REVIEW_REQUIRED') return 'Validation manager requise'
  if (row.status === 'OPEN') return 'Journée en cours ou non figée'
  return '—'
}
