import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { PayGroup } from '@/lib/timegate/types'

export type PayGroupPayload = {
  name: string
  payDayOfMonth: number
}

export function listPayGroups(params?: { page?: number; limit?: number }) {
  return http.get<PaginatedResponse<PayGroup>>('/pay-groups', { params })
}

export function getPayGroup(id: string) {
  return http.get<PayGroup>(`/pay-groups/${id}`)
}

export function createPayGroup(body: PayGroupPayload) {
  return http.post<PayGroup>('/pay-groups', body)
}

export function updatePayGroup(id: string, body: Partial<PayGroupPayload>) {
  return http.patch<PayGroup>(`/pay-groups/${id}`, body)
}

export function deletePayGroup(id: string) {
  return http.delete<{ id: string; deleted: boolean }>(`/pay-groups/${id}`)
}
