import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { EmploymentType } from '@/lib/timegate/types'

export type NamedEntityPayload = { name: string }

export function listEmploymentTypes(params?: { page?: number; limit?: number }) {
  return http.get<PaginatedResponse<EmploymentType>>('/employment-types', { params })
}

export function getEmploymentType(id: string) {
  return http.get<EmploymentType>(`/employment-types/${id}`)
}

export function createEmploymentType(body: NamedEntityPayload) {
  return http.post<EmploymentType>('/employment-types', body)
}

export function updateEmploymentType(id: string, body: Partial<NamedEntityPayload>) {
  return http.patch<EmploymentType>(`/employment-types/${id}`, body)
}

export function deleteEmploymentType(id: string) {
  return http.delete<{ id: string; deleted: boolean }>(`/employment-types/${id}`)
}
