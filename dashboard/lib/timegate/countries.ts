import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'

export type Country = {
  id: string
  name: string
  isoCode: string
  phoneCode?: string | null
  createdAt: string
  updatedAt: string
}

export type CountryPayload = {
  name: string
  isoCode: string
  phoneCode?: string
}

export function listCountries(params?: { page?: number; limit?: number }) {
  return http.get<PaginatedResponse<Country>>('/countries', { params })
}

export function getCountry(id: string) {
  return http.get<Country>(`/countries/${id}`)
}

export function createCountry(body: CountryPayload) {
  return http.post<Country>('/countries', body)
}

export function updateCountry(id: string, body: Partial<CountryPayload>) {
  return http.patch<Country>(`/countries/${id}`, body)
}

export function deleteCountry(id: string) {
  return http.delete<{ id: string; deleted: boolean }>(`/countries/${id}`)
}
