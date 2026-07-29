import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { PayrollLine, PayrollRun } from '@/lib/timegate/types'

export type PayrollRunQuery = {
  page?: number
  limit?: number
  status?: string
  year?: number
  month?: number
}

export type PayrollRunPayload = {
  year: number
  month: number
}

export function listPayrollRuns(params?: PayrollRunQuery) {
  return http.get<PaginatedResponse<PayrollRun>>('/payroll-runs', { params })
}

export function getPayrollRun(id: string) {
  return http.get<PayrollRun>(`/payroll-runs/${id}`)
}

export function createPayrollRun(body: PayrollRunPayload) {
  return http.post<PayrollRun>('/payroll-runs', body)
}

export function getPayrollRunLines(id: string, params?: { page?: number; limit?: number }) {
  // API returns a bare array (not a paginated envelope).
  return http.get<PayrollLine[]>(`/payroll-runs/${id}/lines`, { params })
}

export function exportPayrollRun(id: string) {
  return http.get<{ filename: string; csv: string }>(`/payroll-runs/${id}/export`)
}

export function lockPayrollRun(id: string) {
  return http.patch<PayrollRun>(`/payroll-runs/${id}/lock`, {})
}

export function markPayrollRunPaid(id: string) {
  return http.patch<PayrollRun>(`/payroll-runs/${id}/mark-paid`, {})
}

export const MONTH_LABELS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
]
