import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { Employee } from '@/lib/timegate/types'

export type EmployeeQuery = {
  page?: number
  limit?: number
  branchId?: string
  search?: string
  isActive?: boolean
}

export type EmployeePayload = {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  whatsappPhone?: string
  birthDate?: string
  hireDate?: string
  gender?: string
  nationality?: string
  maritalStatus?: string
  addressLine1?: string
  addressLine2?: string
  cityId?: string
  countryId?: string
  province?: string
  postalCode?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  nationalIdNumber?: string
  passportNumber?: string
  branchId?: string
  defaultShiftId?: string
  departmentId?: string
  designationId?: string
  employmentTypeId?: string
  holidayListId?: string | null
  payGroupId?: string | null
  payDueDayOverride?: number | null
  isActive?: boolean
}

export function listEmployees(params?: EmployeeQuery): Promise<PaginatedResponse<Employee>> {
  return http.get<PaginatedResponse<Employee>>('/employees', { params })
}

export function getEmployee(id: string): Promise<Employee> {
  return http.get<Employee>(`/employees/${id}`)
}

export function createEmployee(body: EmployeePayload): Promise<Employee> {
  return http.post<Employee>('/employees', body)
}

export function updateEmployee(id: string, body: Partial<EmployeePayload>): Promise<Employee> {
  return http.patch<Employee>(`/employees/${id}`, body)
}

export function deleteEmployee(id: string): Promise<{ id: string; deleted: boolean }> {
  return http.delete<{ id: string; deleted: boolean }>(`/employees/${id}`)
}

export type BulkImportResult = {
  created: number
  failed: number
  employees: Array<{ row: number; id: string; firstName: string; lastName: string }>
  errors: Array<{ row: number; message: string }>
}

export function bulkCreateEmployees(employees: EmployeePayload[]): Promise<BulkImportResult> {
  return http.post<BulkImportResult>('/employees/bulk', { employees })
}

export type LeaveBalance = {
  leaveTypeId: string
  leaveTypeName: string
  year: number
  allocated: number | null
  used: number
  remaining: number | null
  unlimited: boolean
}

export type EmployeeLeaveBalances = {
  employeeId: string
  year: number
  balances: LeaveBalance[]
}

export function getEmployeeLeaveBalances(id: string, year?: number): Promise<EmployeeLeaveBalances> {
  return http.get<EmployeeLeaveBalances>(`/employees/${id}/leave-balances`, {
    params: year ? { year } : undefined,
  })
}
