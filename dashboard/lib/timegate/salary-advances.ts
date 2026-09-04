import { http } from '@/lib/http'
import type { SalaryAdvance, SalaryAdvanceStatus } from '@/lib/timegate/types'

export type CreateSalaryAdvancePayload = {
  amount: number
  notes?: string
  disbursed?: boolean
}

export function listSalaryAdvances(employeeId: string) {
  return http.get<SalaryAdvance[]>(`/employees/${employeeId}/salary-advances`)
}

export function createSalaryAdvance(employeeId: string, body: CreateSalaryAdvancePayload) {
  return http.post<SalaryAdvance>(`/employees/${employeeId}/salary-advances`, body)
}

export function disburseSalaryAdvance(employeeId: string, id: string) {
  return http.patch<SalaryAdvance>(`/employees/${employeeId}/salary-advances/${id}/disburse`, {})
}

export function cancelSalaryAdvance(employeeId: string, id: string) {
  return http.patch<SalaryAdvance>(`/employees/${employeeId}/salary-advances/${id}/cancel`, {})
}

export const SALARY_ADVANCE_STATUS_LABELS: Record<SalaryAdvanceStatus, string> = {
  PENDING: 'En attente',
  DISBURSED: 'Versée',
  DEDUCTED: 'Retenue sur paie',
  CANCELLED: 'Annulée',
}
