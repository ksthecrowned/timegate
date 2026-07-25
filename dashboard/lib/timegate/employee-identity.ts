import { http } from '@/lib/http'

export function setEmployeeNfcBadge(id: string, badgeUid?: string | null) {
  return http.patch<{ id: string; hasNfcBadge: boolean; nfcBadgeUid: string | null }>(
    `/employees/${id}/nfc-badge`,
    { badgeUid: badgeUid ?? null },
  )
}
