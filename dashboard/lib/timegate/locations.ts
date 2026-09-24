import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'

export type TimeGateLocationType = 'BRANCH_SITE' | 'CLIENT_SITE' | 'TEMPORARY'

export type TimeGateLocation = {
  id: string
  companyId: string
  name: string
  type: TimeGateLocationType
  isActive: boolean
  branchId: string | null
  timeZone: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  checkinRadius: number | null
  clientLabel: string | null
  createdAt: string
  updatedAt: string
}

export type LocationQuery = {
  page?: number
  limit?: number
  type?: TimeGateLocationType
  branchId?: string
  isActive?: boolean
}

export type LocationPayload = {
  name: string
  type?: TimeGateLocationType
  branchId?: string
  timeZone?: string
  address?: string
  clientLabel?: string
  latitude?: number
  longitude?: number
  checkinRadius?: number
  isActive?: boolean
}

export function listLocations(params?: LocationQuery): Promise<PaginatedResponse<TimeGateLocation>> {
  return http.get<PaginatedResponse<TimeGateLocation>>('/locations', { params })
}

export function getLocation(id: string): Promise<TimeGateLocation> {
  return http.get<TimeGateLocation>(`/locations/${id}`)
}

export function createLocation(body: LocationPayload): Promise<TimeGateLocation> {
  return http.post<TimeGateLocation>('/locations', body)
}

export function updateLocation(
  id: string,
  body: Partial<LocationPayload>,
): Promise<TimeGateLocation> {
  return http.patch<TimeGateLocation>(`/locations/${id}`, body)
}

export function archiveLocation(
  id: string,
  body?: { reason?: string },
): Promise<TimeGateLocation> {
  return http.post<TimeGateLocation>(`/locations/${id}/archive`, body ?? {})
}

export function restoreLocation(id: string): Promise<TimeGateLocation> {
  return http.post<TimeGateLocation>(`/locations/${id}/restore`, {})
}
