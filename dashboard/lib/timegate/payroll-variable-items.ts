import { http } from '@/lib/http'
import type { CompensationItemKind } from '@/lib/timegate/employee-compensation'

export type PayrollVariableItem = {
  id: string
  companyId: string
  employeeId: string
  payrollRunId: string
  label: string
  kind: CompensationItemKind
  amount: number
  source: string
  notes?: string | null
  createdAt: string
}

export type PayrollVariableItemPayload = {
  employeeId: string
  label: string
  kind: CompensationItemKind
  amount: number
  notes?: string
}

export function listPayrollVariableItems(runId: string) {
  return http.get<PayrollVariableItem[]>(`/payroll-runs/${runId}/variable-items`)
}

export function createPayrollVariableItem(runId: string, body: PayrollVariableItemPayload) {
  return http.post<PayrollVariableItem>(`/payroll-runs/${runId}/variable-items`, body)
}

export function deletePayrollVariableItem(runId: string, id: string) {
  return http.delete<{ deleted: boolean }>(`/payroll-runs/${runId}/variable-items/${id}`)
}
