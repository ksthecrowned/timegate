import { http } from '@/lib/http'

export type CompensationItemKind = 'ALLOWANCE' | 'DEDUCTION'

export type EmployeeCompensationItem = {
  id: string
  companyId: string
  employeeId: string
  label: string
  kind: CompensationItemKind
  amount: number
  isRecurring: boolean
  effectiveFrom: string
  effectiveTo: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type EmployeeCompensationItemPayload = {
  label: string
  kind: CompensationItemKind
  amount: number
  isRecurring?: boolean
  effectiveFrom: string
  effectiveTo?: string
}

export function listEmployeeCompensationItems(employeeId: string) {
  return http.get<EmployeeCompensationItem[]>(`/employees/${employeeId}/compensation-items`)
}

export function createEmployeeCompensationItem(
  employeeId: string,
  body: EmployeeCompensationItemPayload,
) {
  return http.post<EmployeeCompensationItem>(`/employees/${employeeId}/compensation-items`, body)
}

export function updateEmployeeCompensationItem(
  employeeId: string,
  id: string,
  body: Partial<EmployeeCompensationItemPayload>,
) {
  return http.patch<EmployeeCompensationItem>(
    `/employees/${employeeId}/compensation-items/${id}`,
    body,
  )
}

export function deleteEmployeeCompensationItem(employeeId: string, id: string) {
  return http.delete<{ deleted: boolean }>(`/employees/${employeeId}/compensation-items/${id}`)
}
