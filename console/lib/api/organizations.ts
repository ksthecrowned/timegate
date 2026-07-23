import { http } from '@/lib/http'
import type {
  ActivationKey,
  ActivationKeyResult,
  Organization,
  PlatformStats,
} from '@/lib/api/types'

export type CreateOrganizationPayload = {
  name: string
  sku: string
}

export type CreateOrganizationAdminPayload = {
  email: string
  password: string
}

export type CreateActivationKeyPayload = {
  planId?: string
  plan?: string
  maxEmployees?: number
  maxDevices?: number
  expiresAt?: string
}

export function listOrganizations(): Promise<Organization[]> {
  return http.get<Organization[]>('/auth/super-admin/organizations')
}

export function getOrganization(organizationId: string): Promise<Organization> {
  return http.get<Organization>(`/auth/super-admin/organizations/${organizationId}`)
}

export function createOrganization(payload: CreateOrganizationPayload) {
  return http.post<Organization>('/auth/super-admin/organizations', payload)
}

export function createOrganizationAdmin(
  organizationId: string,
  payload: CreateOrganizationAdminPayload,
) {
  return http.post<{ id: string; email: string; role: string; companyId: string; createdAt: string }>(
    `/auth/super-admin/organizations/${organizationId}/admins`,
    payload,
  )
}

export function createActivationKey(organizationId: string, payload: CreateActivationKeyPayload) {
  return http.post<ActivationKeyResult>(
    `/auth/super-admin/organizations/${organizationId}/activation-keys`,
    payload,
  )
}

export function listActivationKeys(): Promise<ActivationKey[]> {
  return http.get<ActivationKey[]>('/auth/super-admin/activation-keys')
}

export function setOrganizationSuspension(organizationId: string, suspended: boolean) {
  return http.patch<{ id: string; name: string; sku: string; suspendedAt: string | null }>(
    `/organizations/${organizationId}/suspension`,
    { suspended },
  )
}

export function getPlatformStats(): Promise<PlatformStats> {
  return http.get<PlatformStats>('/admin-saas/platform-stats')
}
