import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'

export type ShiftSwapRequest = {
  id: string
  swapDate: string
  reason: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  reviewNote: string | null
  reviewedAt: string | null
  requester: { id: string; firstName: string; lastName: string }
  target: { id: string; firstName: string; lastName: string } | null
  shiftAssignment: { id: string; shiftTypeName: string } | null
  createdAt: string
}

export async function listShiftSwaps(params?: { page?: number; limit?: number; status?: string }) {
  return http.get<PaginatedResponse<ShiftSwapRequest>>('/shift-swaps', { params })
}

export async function createShiftSwap(body: {
  requesterEmployeeId: string
  targetEmployeeId?: string
  shiftAssignmentId?: string
  swapDate: string
  reason?: string
}) {
  return http.post<ShiftSwapRequest>('/shift-swaps', body)
}

export async function reviewShiftSwap(
  id: string,
  body: { status: 'APPROVED' | 'REJECTED'; reviewNote?: string },
) {
  return http.patch<ShiftSwapRequest>(`/shift-swaps/${id}/review`, body)
}

export async function setEmployeeKioskPin(id: string, pin?: string) {
  return http.patch<{ id: string; hasKioskPin: boolean }>(`/employees/${id}/kiosk-pin`, { pin })
}
