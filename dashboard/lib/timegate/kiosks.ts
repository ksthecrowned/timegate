import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { Kiosk } from '@/lib/timegate/types'

export type KioskQuery = {
  page?: number
  limit?: number
  branchId?: string
}

export type KioskPayload = {
  name: string
  branchId: string
  shiftLocationId?: string
  faceEnabled?: boolean
  nfcEnabled?: boolean
  qrEnabled?: boolean
}

export type KioskUpdatePayload = Partial<KioskPayload & { isActive?: boolean }>

export function listKiosks(params?: KioskQuery): Promise<PaginatedResponse<Kiosk>> {
  return http.get<PaginatedResponse<Kiosk>>('/kiosks', { params })
}

export function getKiosk(id: string): Promise<Kiosk> {
  return http.get<Kiosk>(`/kiosks/${id}`)
}

export function createKiosk(body: KioskPayload): Promise<Kiosk> {
  return http.post<Kiosk>('/kiosks', body)
}

export function updateKiosk(id: string, body: KioskUpdatePayload): Promise<Kiosk> {
  return http.patch<Kiosk>(`/kiosks/${id}`, body)
}

export function regenerateKioskApiKey(id: string): Promise<Kiosk> {
  return http.post<Kiosk>(`/kiosks/${id}/regenerate-api-key`)
}

export function deleteKiosk(id: string): Promise<{ id: string; deleted: boolean }> {
  return http.delete<{ id: string; deleted: boolean }>(`/kiosks/${id}`)
}
