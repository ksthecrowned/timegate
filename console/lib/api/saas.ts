import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type {
  PlatformSettings,
  Subscription,
  SubscriptionPlan,
} from '@/lib/api/types'

export function listPlans(includeInactive = true): Promise<SubscriptionPlan[]> {
  return http.get<SubscriptionPlan[]>('/plans', {
    params: includeInactive ? { includeInactive: 'true' } : undefined,
  })
}

export function getPlan(id: string): Promise<SubscriptionPlan> {
  return http.get<SubscriptionPlan>(`/plans/${id}`)
}

export type CreatePlanPayload = {
  code: string
  label: string
  maxEmployees: number
  maxKiosks: number
  durationDays?: number
  isActive?: boolean
  sortOrder?: number
}

export function createPlan(payload: CreatePlanPayload): Promise<SubscriptionPlan> {
  return http.post<SubscriptionPlan>('/plans', payload)
}

export function updatePlan(
  id: string,
  payload: Partial<CreatePlanPayload & { isActive?: boolean }>,
): Promise<SubscriptionPlan> {
  return http.patch<SubscriptionPlan>(`/plans/${id}`, payload)
}

export function getPlatformSettings(): Promise<PlatformSettings> {
  return http.get<PlatformSettings>('/platform-settings')
}

export function updatePlatformSettings(
  payload: Partial<
    Pick<PlatformSettings, 'trialDays' | 'trialMaxEmployees' | 'trialMaxKiosks' | 'gracePeriodDays'>
  >,
): Promise<PlatformSettings> {
  return http.patch<PlatformSettings>('/platform-settings', payload)
}

export function listSubscriptions(params?: { page?: number; limit?: number }) {
  return http.get<PaginatedResponse<Subscription>>('/subscriptions', { params })
}

export function listAuditLogs(params?: {
  page?: number
  limit?: number
  from?: string
  to?: string
}) {
  return http.get<PaginatedResponse<import('@/lib/api/types').AuditLog>>('/audit-logs', { params })
}

export function listCountries(params?: { page?: number; limit?: number }) {
  return http.get<PaginatedResponse<import('@/lib/api/types').Country>>('/countries', { params })
}

export function listCities(params?: { page?: number; limit?: number; countryId?: string }) {
  return http.get<PaginatedResponse<import('@/lib/api/types').City>>('/cities', { params })
}

/** Calcule une date d'expiration à partir d'une durée en mois. */
export function expiresAtFromMonths(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() + months)
  return d.toISOString()
}
