import { http } from '@/lib/http'
import type { TimeGateRole } from '@/lib/timegate/types'

export type CreateAdminUserPayload = {
  email: string
  password: string
  role: TimeGateRole
  locationIds?: string[]
}

export type AdminUserEmployee = {
  id: string
  name: string
  status: string
}

export type ManagedLocationSummary = {
  id: string
  name: string
  type: string
  clientLabel?: string | null
}

export type AdminUser = {
  id: string
  email: string
  role: TimeGateRole
  timeGateRole?: TimeGateRole
  enabled?: boolean
  createdAt: string
  employee?: AdminUserEmployee | null
  managedLocations?: ManagedLocationSummary[]
}

export function createAdminUser(payload: CreateAdminUserPayload) {
  return http.post<AdminUser>('/auth/users', payload)
}

export function listAdminUsers() {
  return http.get<AdminUser[]>('/auth/users')
}

export function getManagedLocations(userId: string) {
  return http.get<{
    userId: string
    role: TimeGateRole | null
    locations: ManagedLocationSummary[]
  }>(`/auth/users/${userId}/managed-locations`)
}

export function setManagedLocations(userId: string, locationIds: string[]) {
  return http.patch<{ userId: string; locations: ManagedLocationSummary[] }>(
    `/auth/users/${userId}/managed-locations`,
    { locationIds },
  )
}
