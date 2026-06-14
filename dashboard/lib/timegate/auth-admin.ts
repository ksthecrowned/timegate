import { http } from '@/lib/http'
import type { TimeGateRole } from '@/lib/timegate/types'

export type CreateAdminUserPayload = {
  email: string
  password: string
  role: TimeGateRole
  companyId?: string
}

export type AdminUser = {
  id: string
  email: string
  role: TimeGateRole
  timeGateRole?: TimeGateRole
  createdAt: string
}

export function createAdminUser(payload: CreateAdminUserPayload) {
  return http.post<AdminUser>('/auth/users', payload)
}

export function listAdminUsers() {
  return http.get<AdminUser[]>('/auth/users')
}
