import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { EmployeeContract } from '@/lib/timegate/types'

export type EmployeeContractPayload = {
  signedAt: string
  expiresAt?: string
  renewalsCount?: number
  notes?: string
}

export function listEmployeeContracts(params?: {
  page?: number
  limit?: number
  employeeId?: string
  status?: 'current' | 'expiring' | 'expired' | 'past'
}) {
  return http.get<PaginatedResponse<EmployeeContract>>('/employees/contracts', { params })
}

export function createEmployeeContract(
  employeeId: string,
  payload: EmployeeContractPayload,
  contractFile?: File,
) {
  const body = new FormData()
  body.append('signedAt', payload.signedAt)
  if (payload.expiresAt) body.append('expiresAt', payload.expiresAt)
  if (payload.renewalsCount != null) body.append('renewalsCount', String(payload.renewalsCount))
  if (payload.notes) body.append('notes', payload.notes)
  if (contractFile) body.append('contractFile', contractFile)
  return http.post<EmployeeContract>(`/employees/${employeeId}/contracts`, body)
}

export function updateEmployeeContract(
  employeeId: string,
  contractId: string,
  payload: Partial<EmployeeContractPayload>,
  contractFile?: File,
) {
  const body = new FormData()
  if (payload.signedAt) body.append('signedAt', payload.signedAt)
  if (payload.expiresAt !== undefined) body.append('expiresAt', payload.expiresAt)
  if (payload.renewalsCount != null) body.append('renewalsCount', String(payload.renewalsCount))
  if (payload.notes !== undefined) body.append('notes', payload.notes)
  if (contractFile) body.append('contractFile', contractFile)
  return http.patch<EmployeeContract>(`/employees/${employeeId}/contracts/${contractId}`, body)
}

export function deleteEmployeeContract(employeeId: string, contractId: string) {
  return http.delete<{ id: string; deleted: boolean }>(
    `/employees/${employeeId}/contracts/${contractId}`,
  )
}
