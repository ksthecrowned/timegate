import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'

export type NamedEntity = {
  id: string
  name: string
}

export function listDepartments(params?: { page?: number; limit?: number }) {
  return http.get<PaginatedResponse<NamedEntity>>('/departments', {
    params: { page: 1, limit: 100, ...params },
  })
}

export function listDesignations(params?: { page?: number; limit?: number }) {
  return http.get<PaginatedResponse<NamedEntity>>('/designations', {
    params: { page: 1, limit: 100, ...params },
  })
}

export function listShiftTypes(params?: { page?: number; limit?: number; branchId?: string }) {
  return http.get<PaginatedResponse<NamedEntity & { branchId?: string | null }>>('/shift-types', {
    params: { page: 1, limit: 100, ...params },
  })
}

export function listShiftLocations(params?: {
  page?: number
  limit?: number
  branchId?: string
}) {
  return http.get<PaginatedResponse<NamedEntity & { branchId?: string | null }>>(
    '/shift-locations',
    { params: { page: 1, limit: 100, ...params } },
  )
}

export function listLeaveTypes(params?: { page?: number; limit?: number }) {
  return http.get<PaginatedResponse<NamedEntity>>('/leave-types', {
    params: { page: 1, limit: 100, ...params },
  })
}

export function listHolidayLists(params?: { page?: number; limit?: number }) {
  return http.get<PaginatedResponse<NamedEntity>>('/holiday-lists', {
    params: { page: 1, limit: 100, ...params },
  })
}
