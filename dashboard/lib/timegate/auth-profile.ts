import { http } from '@/lib/http'
import type { TimeGateUser } from '@/lib/timegate/types'

export function updateProfile(body: { firstName?: string; lastName?: string }) {
  return http.patch<TimeGateUser>('/auth/me', body)
}

export function changePassword(body: { currentPassword: string; newPassword: string }) {
  return http.patch<{ ok: true }>('/auth/me/password', body)
}
