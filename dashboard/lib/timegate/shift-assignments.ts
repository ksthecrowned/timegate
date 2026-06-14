import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { ShiftAssignment } from '@/lib/timegate/types'

export type ShiftAssignmentPayload = {
  employeeId: string
  shiftTypeId: string
  shiftLocationId?: string
  startDate?: string
  endDate?: string
}

export function listShiftAssignments(params?: {
  page?: number
  limit?: number
  shiftTypeId?: string
  shiftLocationId?: string
}) {
  return http.get<PaginatedResponse<ShiftAssignment>>('/shift-assignments', { params })
}

export function getShiftAssignment(id: string) {
  return http.get<ShiftAssignment>(`/shift-assignments/${id}`)
}

export function createShiftAssignment(body: ShiftAssignmentPayload) {
  return http.post<ShiftAssignment>('/shift-assignments', body)
}

export function updateShiftAssignment(id: string, body: Partial<ShiftAssignmentPayload>) {
  return http.patch<ShiftAssignment>(`/shift-assignments/${id}`, body)
}

export function deleteShiftAssignment(id: string) {
  return http.delete<{ id: string; deleted: boolean }>(`/shift-assignments/${id}`)
}
