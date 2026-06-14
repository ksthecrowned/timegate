import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { Salary, SalaryStatus } from '@/lib/timegate/types'

export type SalaryPayload = {
  employeeId: string
  year: number
  month: number
  baseSalary: number
  bonuses?: number
  deductions?: number
  notes?: string
}

export type SalaryUpdatePayload = Partial<SalaryPayload & { status?: SalaryStatus; paidAt?: string }>

export function listSalaries(params?: {
  page?: number
  limit?: number
  employeeId?: string
  year?: number
  month?: number
}) {
  return http.get<PaginatedResponse<Salary>>('/salaries', { params })
}

export function createSalary(body: SalaryPayload) {
  return http.post<Salary>('/salaries', body)
}

export function getSalary(id: string) {
  return http.get<Salary>(`/salaries/${id}`)
}

export function updateSalary(id: string, body: SalaryUpdatePayload) {
  return http.patch<Salary>(`/salaries/${id}`, body)
}

export function markSalaryPaid(id: string) {
  return http.patch<Salary>(`/salaries/${id}/mark-paid`, {})
}

export function deleteSalary(id: string) {
  return http.delete<{ id: string; deleted: boolean }>(`/salaries/${id}`)
}
