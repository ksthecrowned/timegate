import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { CompensationGridEntry } from '@/lib/timegate/types'

export type CompensationGridPayload = {
  designationId: string
  employmentTypeId: string
  baseSalary: number
  effectiveFrom: string
  effectiveTo?: string
}

export function listCompensationGrid(params?: {
  page?: number
  limit?: number
  designationId?: string
  employmentTypeId?: string
}) {
  return http.get<PaginatedResponse<CompensationGridEntry>>('/compensation-grid', { params })
}

export function getCompensationGrid(id: string) {
  return http.get<CompensationGridEntry>(`/compensation-grid/${id}`)
}

export function createCompensationGrid(body: CompensationGridPayload) {
  return http.post<CompensationGridEntry>('/compensation-grid', body)
}

export function updateCompensationGrid(id: string, body: Partial<CompensationGridPayload>) {
  return http.patch<CompensationGridEntry>(`/compensation-grid/${id}`, body)
}

export function deleteCompensationGrid(id: string) {
  return http.delete<{ id: string; deleted: boolean }>(`/compensation-grid/${id}`)
}
