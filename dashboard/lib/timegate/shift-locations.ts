import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { ShiftLocation } from '@/lib/timegate/types'

export type ShiftLocationPayload = {
  name: string
  branchId?: string
  checkinRadius?: number
  latitude?: number
  longitude?: number
  isKioskLocation?: boolean
}

export function listShiftLocations(params?: {
  page?: number
  limit?: number
  branchId?: string
  isKioskLocation?: boolean
}) {
  return http.get<PaginatedResponse<ShiftLocation>>('/shift-locations', { params })
}

export function getShiftLocation(id: string) {
  return http.get<ShiftLocation>(`/shift-locations/${id}`)
}

export function createShiftLocation(body: ShiftLocationPayload) {
  return http.post<ShiftLocation>('/shift-locations', body)
}

export function updateShiftLocation(id: string, body: Partial<ShiftLocationPayload>) {
  return http.patch<ShiftLocation>(`/shift-locations/${id}`, body)
}

export function deleteShiftLocation(id: string) {
  return http.delete<{ id: string; deleted: boolean }>(`/shift-locations/${id}`)
}
