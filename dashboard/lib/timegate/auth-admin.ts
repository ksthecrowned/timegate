import { http } from '@/lib/http'
import type { TimeGateRole } from '@/lib/timegate/types'

export type CreateAdminUserPayload = {
  email: string
  password: string
  role: TimeGateRole
}

export type AdminUserEmployee = {
  id: string
  name: string
  status: string
}

export type AdminUser = {
  id: string
  email: string
  role: TimeGateRole
  timeGateRole?: TimeGateRole
  enabled?: boolean
  createdAt: string
  employee?: AdminUserEmployee | null
}

export function createAdminUser(payload: CreateAdminUserPayload) {
  return http.post<AdminUser>('/auth/users', payload)
}

export function listAdminUsers() {
  return http.get<AdminUser[]>('/auth/users')
}
