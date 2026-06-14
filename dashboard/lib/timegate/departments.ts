import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { Department } from '@/lib/timegate/types'

export type NamedEntityPayload = { name: string }

export function listDepartments(params?: { page?: number; limit?: number }) {
  return http.get<PaginatedResponse<Department>>('/departments', { params })
}

export function getDepartment(id: string) {
  return http.get<Department>(`/departments/${id}`)
}

export function createDepartment(body: NamedEntityPayload) {
  return http.post<Department>('/departments', body)
}

export function updateDepartment(id: string, body: Partial<NamedEntityPayload>) {
  return http.patch<Department>(`/departments/${id}`, body)
}

export function deleteDepartment(id: string) {
  return http.delete<{ id: string; deleted: boolean }>(`/departments/${id}`)
}
