import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { AuditLog, Subscription, SystemConfig } from '@/lib/timegate/types'

export function listAuditLogs(params?: {
  page?: number
  limit?: number
  from?: string
  to?: string
}) {
  return http.get<PaginatedResponse<AuditLog>>('/audit-logs', { params })
}

export function listSubscriptions(params?: { page?: number; limit?: number }) {
  return http.get<PaginatedResponse<Subscription>>('/subscriptions', { params })
}

export function listSystemConfigs(params?: { page?: number; limit?: number }) {
  return http.get<PaginatedResponse<SystemConfig>>('/system-config', { params })
}

export function updateSystemConfig(
  id: string,
  payload: Partial<Pick<SystemConfig, 'minConfidence' | 'lateThreshold' | 'veryLateThreshold'>>,
) {
  return http.patch<SystemConfig>(`/system-config/${id}`, payload)
}
