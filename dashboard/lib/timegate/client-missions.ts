import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'

export type ClientMissionStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED'

export type ClientMission = {
  id: string
  companyId: string
  title: string
  status: ClientMissionStatus
  locationId: string
  branchId: string
  kioskId: string
  publicSlug: string
  publicPath: string
  startsAt: string | null
  endsAt: string | null
  createdAt: string
  updatedAt: string
  location?: {
    id: string
    name: string
    type: string
    clientLabel: string | null
    address: string | null
  }
  branch?: { id: string; name: string }
  kiosk?: { id: string; name: string; isActive: boolean; qrEnabled: boolean }
}

export type ClientMissionPayload = {
  title: string
  locationId?: string
  clientLabel?: string
  address?: string
  branchId?: string
  startsAt?: string
  endsAt?: string
  status?: ClientMissionStatus
}

export function listClientMissions(params?: {
  page?: number
  limit?: number
  status?: ClientMissionStatus
}): Promise<PaginatedResponse<ClientMission>> {
  return http.get<PaginatedResponse<ClientMission>>('/client-missions', { params })
}

export function getClientMission(id: string): Promise<ClientMission> {
  return http.get<ClientMission>(`/client-missions/${id}`)
}

export function createClientMission(body: ClientMissionPayload): Promise<ClientMission> {
  return http.post<ClientMission>('/client-missions', body)
}

export function updateClientMission(
  id: string,
  body: Partial<ClientMissionPayload> & { status?: ClientMissionStatus },
): Promise<ClientMission> {
  return http.patch<ClientMission>(`/client-missions/${id}`, body)
}

export type PublicClientMissionMeta = {
  slug: string
  title: string
  clientLabel: string
  locationName: string
  companyName: string | null
}

export function getPublicClientMission(slug: string): Promise<PublicClientMissionMeta> {
  return http.get<PublicClientMissionMeta>(`/public/client-missions/${slug}`, {
    skipAuth: true,
  })
}

export function createPublicQrChallenge(slug: string): Promise<{
  id: string
  payload: string
  expiresAt: string
}> {
  return http.post(
    `/public/client-missions/${slug}/qr-challenge`,
    {},
    { skipAuth: true },
  )
}

export function getPublicQrChallengeResult(
  slug: string,
  challengeId: string,
): Promise<{
  status: 'PENDING' | 'REDEEMED' | 'EXPIRED'
  result: unknown
}> {
  return http.get(`/public/client-missions/${slug}/qr-challenge/${challengeId}/result`, {
    skipAuth: true,
  })
}
