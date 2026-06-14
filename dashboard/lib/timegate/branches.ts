import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { Branch } from '@/lib/timegate/types'

export type BranchQuery = {
  page?: number
  limit?: number
}

export type BranchPayload = {
  name: string
  branchCode?: string
  address?: string
  timezone?: string
  cityId?: string
  countryId?: string
  latitude?: number
  longitude?: number
  checkinRadius?: number
  phone?: string
  email?: string
  isHeadOffice?: boolean
  isActive?: boolean
}

export function listBranches(params?: BranchQuery): Promise<PaginatedResponse<Branch>> {
  return http.get<PaginatedResponse<Branch>>('/branches', { params })
}

export function getBranch(id: string): Promise<Branch> {
  return http.get<Branch>(`/branches/${id}`)
}

export function createBranch(body: BranchPayload): Promise<Branch> {
  return http.post<Branch>('/branches', body)
}

export function updateBranch(id: string, body: Partial<BranchPayload>): Promise<Branch> {
  return http.patch<Branch>(`/branches/${id}`, body)
}

export function deleteBranch(id: string): Promise<{ id: string; deleted: boolean }> {
  return http.delete<{ id: string; deleted: boolean }>(`/branches/${id}`)
}
