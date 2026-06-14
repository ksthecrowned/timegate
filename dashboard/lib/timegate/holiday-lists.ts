import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { HolidayList } from '@/lib/timegate/types'

export function listHolidayLists(params?: { page?: number; limit?: number }) {
  return http.get<PaginatedResponse<HolidayList>>('/holiday-lists', { params })
}
