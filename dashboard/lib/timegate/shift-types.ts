import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { ShiftType } from '@/lib/timegate/types'

export type ShiftTypePayload = {
  branchId: string
  name: string
  startTime: string
  endTime: string
  lateGraceMinutes?: number
  checkInWindowStart?: string
  checkInWindowEnd?: string
  checkOutWindowStart?: string
  checkOutWindowEnd?: string
  breakWindowStart?: string
  breakWindowEnd?: string
  breakDurationMinutes?: number
}

export function listShiftTypes(params?: { page?: number; limit?: number; branchId?: string }) {
  return http.get<PaginatedResponse<ShiftType>>('/shift-types', { params })
}

export function getShiftType(id: string) {
  return http.get<ShiftType>(`/shift-types/${id}`)
}

export function createShiftType(body: ShiftTypePayload) {
  return http.post<ShiftType>('/shift-types', body)
}

export function updateShiftType(id: string, body: Partial<ShiftTypePayload>) {
  return http.patch<ShiftType>(`/shift-types/${id}`, body)
}

export function deleteShiftType(id: string) {
  return http.delete<{ id: string; deleted: boolean }>(`/shift-types/${id}`)
}
