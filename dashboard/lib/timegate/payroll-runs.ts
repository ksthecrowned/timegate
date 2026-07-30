import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type {
  PayrollBranchPaymentSummary,
  PayrollLine,
  PayrollLinePaymentStatus,
  PayrollRun,
} from '@/lib/timegate/types'

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

export type PayrollLinesQuery = {
  page?: number
  limit?: number
  branchId?: string
  payGroupId?: string
  paymentStatus?: PayrollLinePaymentStatus
  dueFrom?: string
  dueTo?: string
}

export type MarkLinesPaidPayload = {
  lineIds: string[]
  paidAt?: string
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

export function getPayrollRunLines(id: string, params?: PayrollLinesQuery) {
  // API returns a bare array (not a paginated envelope).
  return http.get<PayrollLine[]>(`/payroll-runs/${id}/lines`, { params })
}

export function exportPayrollRun(id: string) {
  return http.get<{ filename: string; csv: string }>(`/payroll-runs/${id}/export`)
}

export function lockPayrollRun(id: string) {
  return http.patch<PayrollRun>(`/payroll-runs/${id}/lock`, {})
}

export function markLinesPaid(id: string, body: MarkLinesPaidPayload) {
  return http.post<PayrollRun>(`/payroll-runs/${id}/mark-lines-paid`, body)
}

export function getPaymentSummaryByBranch(id: string) {
  return http.get<PayrollBranchPaymentSummary[]>(`/payroll-runs/${id}/payment-summary-by-branch`)
}

export function formatMoney(value: number | undefined | null): string {
  return (value ?? 0).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
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
