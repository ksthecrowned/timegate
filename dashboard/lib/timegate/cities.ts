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

export type CityPayload = {
  name: string
  countryId: string
  latitude?: number
  longitude?: number
}

export function listCities(params?: { page?: number; limit?: number; countryId?: string }) {
  return http.get<PaginatedResponse<City>>('/cities', { params })
}

export function getCity(id: string) {
  return http.get<City>(`/cities/${id}`)
}

export function createCity(body: CityPayload) {
  return http.post<City>('/cities', body)
}

export function updateCity(id: string, body: Partial<CityPayload>) {
  return http.patch<City>(`/cities/${id}`, body)
}

export function deleteCity(id: string) {
  return http.delete<{ id: string; deleted: boolean }>(`/cities/${id}`)
}
