import { http } from '@/lib/http'

export type QrPunchPayload = {
  id: string
  qrPayload: string
  slot: number
  expiresAt: string
  issuedAt?: string
}

export function setEmployeeNfcBadge(id: string, badgeUid?: string | null) {
  return http.patch<{ id: string; hasNfcBadge: boolean; nfcBadgeUid: string | null }>(
    `/employees/${id}/nfc-badge`,
    { badgeUid: badgeUid ?? null },
  )
}

export function activateEmployeeQrPunch(id: string) {
  return http.post<QrPunchPayload>(`/employees/${id}/qr-punch-token/regenerate`)
}

export function fetchEmployeeQrPunchCurrent(id: string) {
  return http.get<QrPunchPayload>(`/employees/${id}/qr-punch/current`)
}

export function revokeEmployeeQrPunch(id: string) {
  return http.delete<{ id: string; hasQrPunchToken: boolean }>(`/employees/${id}/qr-punch-token`)
}
