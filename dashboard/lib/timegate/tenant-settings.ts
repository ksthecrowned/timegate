import { http } from '@/lib/http'
import type { TenantAttendanceSettings } from '@/lib/timegate/types'

export type TenantAttendanceSettingsPayload = {
  defaultShiftTypeId?: string | null
  pinFailureThreshold?: number
  pinFailureCooldownSeconds?: number
}

export function getTenantAttendanceSettings(): Promise<TenantAttendanceSettings> {
  return http.get<TenantAttendanceSettings>('/system-config/tenant')
}

export function updateTenantAttendanceSettings(
  payload: TenantAttendanceSettingsPayload,
): Promise<TenantAttendanceSettings> {
  return http.patch<TenantAttendanceSettings>('/system-config/tenant', payload)
}
