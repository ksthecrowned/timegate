import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { Designation } from '@/lib/timegate/types'

export type NamedEntityPayload = { name: string }

export function listDesignations(params?: { page?: number; limit?: number }) {
  return http.get<PaginatedResponse<Designation>>('/designations', { params })
}

export function getDesignation(id: string) {
  return http.get<Designation>(`/designations/${id}`)
}

export function createDesignation(body: NamedEntityPayload) {
  return http.post<Designation>('/designations', body)
}

export function updateDesignation(id: string, body: Partial<NamedEntityPayload>) {
  return http.patch<Designation>(`/designations/${id}`, body)
}

export function deleteDesignation(id: string) {
  return http.delete<{ id: string; deleted: boolean }>(`/designations/${id}`)
}
