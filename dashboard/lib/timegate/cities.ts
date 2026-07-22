import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'

export type City = {
  id: string
  name: string
  countryId: string
  latitude?: number | null
  longitude?: number | null
  country?: { id: string; name: string; isoCode: string }
  createdAt: string
  updatedAt: string
}

export function listCities(params?: { page?: number; limit?: number; countryId?: string }) {
  return http.get<PaginatedResponse<City>>('/cities', { params })
}
