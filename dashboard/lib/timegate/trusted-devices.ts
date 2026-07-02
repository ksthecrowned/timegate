import { http } from '@/lib/http'

export type TrustedDevice = {
  id: string
  deviceInstallId: string
  platform: string
  deviceLabel: string | null
  status: 'TRUSTED' | 'PENDING' | 'REVOKED'
  trustedAt: string | null
  lastSeenAt: string
  createdAt: string
  sharedDevice: boolean
  employee?: { id: string; name: string; email: string | null } | null
}

export function listPendingTrustedDevices() {
  return http.get<{ data: TrustedDevice[] }>('/trusted-devices/pending')
}

export function listEmployeeTrustedDevices(employeeId: string) {
  return http.get<{ data: TrustedDevice[] }>(`/employees/${employeeId}/trusted-devices`)
}

export function updateTrustedDeviceStatus(
  employeeId: string,
  deviceId: string,
  status: 'TRUSTED' | 'REVOKED',
) {
  return http.patch<TrustedDevice>(`/employees/${employeeId}/trusted-devices/${deviceId}`, {
    status,
  })
}

export function ensureEmployeePortalUser(employeeId: string) {
  return http.post<{ userId: string; email: string; hasPassword: boolean; created: boolean }>(
    `/employees/${employeeId}/portal-user`,
  )
}
