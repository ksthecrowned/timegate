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

export function listCountries(params?: { page?: number; limit?: number }) {
  return http.get<PaginatedResponse<Country>>('/countries', { params })
}
