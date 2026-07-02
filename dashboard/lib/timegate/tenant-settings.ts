import { http } from '@/lib/http'
import type { SystemConfig, TenantAttendanceSettings } from '@/lib/timegate/types'

export type TenantAttendanceSettingsPayload = {
  defaultShiftTypeId?: string | null
  pinFailureThreshold?: number
  pinFailureCooldownSeconds?: number
  timesheetRoundingMinutes?: number
  overtimeAlertThresholdMinutes?: number
  minMinutesBetweenShifts?: number
}

export type TenantSystemConfigPayload = Pick<
  SystemConfig,
  'minConfidence' | 'lateThreshold' | 'veryLateThreshold'
>

export function getTenantAttendanceSettings(): Promise<TenantAttendanceSettings> {
  return http.get<TenantAttendanceSettings>('/system-config/tenant')
}

export function updateTenantAttendanceSettings(
  payload: TenantAttendanceSettingsPayload,
): Promise<TenantAttendanceSettings> {
  return http.patch<TenantAttendanceSettings>('/system-config/tenant', payload)
}

export function getTenantSystemConfig(): Promise<SystemConfig> {
  return http.get<SystemConfig>('/system-config/tenant')
}

export function updateTenantSystemConfig(
  payload: TenantSystemConfigPayload,
): Promise<SystemConfig> {
  return http.patch<SystemConfig>('/system-config/tenant', payload)
}
