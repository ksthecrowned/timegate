import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { Leave, LeaveStatus } from '@/lib/timegate/types'

export type LeavePayload = {
  employeeId: string
  startDate: string
  endDate: string
  reason?: string
  status?: LeaveStatus
  leaveTypeId?: string
}

export function listLeaves(params?: { page?: number; limit?: number; employeeId?: string }) {
  return http.get<PaginatedResponse<Leave>>('/leaves', { params })
}

export function createLeave(body: LeavePayload) {
  return http.post<Leave>('/leaves', body)
}

export function getLeave(id: string) {
  return http.get<Leave>(`/leaves/${id}`)
}

export function updateLeave(id: string, body: Partial<LeavePayload>) {
  return http.patch<Leave>(`/leaves/${id}`, body)
}

export function deleteLeave(id: string) {
  return http.delete<{ id: string; deleted: boolean }>(`/leaves/${id}`)
}
