import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { LeaveType } from '@/lib/timegate/types'

export type LeaveTypePayload = {
  name: string
  isLwp?: boolean
  isCarryForward?: boolean
  maxDaysPerYear?: number | null
}

export function listLeaveTypes(params?: { page?: number; limit?: number }) {
  return http.get<PaginatedResponse<LeaveType>>('/leave-types', { params })
}

export function getLeaveType(id: string) {
  return http.get<LeaveType>(`/leave-types/${id}`)
}

export function createLeaveType(body: LeaveTypePayload) {
  return http.post<LeaveType>('/leave-types', body)
}

export function updateLeaveType(id: string, body: Partial<LeaveTypePayload>) {
  return http.patch<LeaveType>(`/leave-types/${id}`, body)
}

export function deleteLeaveType(id: string) {
  return http.delete<{ id: string; deleted: boolean }>(`/leave-types/${id}`)
}
