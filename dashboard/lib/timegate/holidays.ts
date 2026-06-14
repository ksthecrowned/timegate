import { http } from '@/lib/http'
import type { PaginatedResponse } from '@/lib/http/types'
import type { Holiday } from '@/lib/timegate/types'

export type HolidayPayload = {
  companyId: string
  name: string
  date: string
}

export function listHolidays(params?: { page?: number; limit?: number; from?: string; to?: string }) {
  return http.get<PaginatedResponse<Holiday>>('/holidays', { params })
}

export function listHolidaysForYear(year: number) {
  return listHolidays({
    page: 1,
    limit: 500,
    from: `${year}-01-01`,
    to: `${year}-12-31`,
  })
}

export function createHoliday(body: HolidayPayload) {
  return http.post<Holiday>('/holidays', body)
}

export function getHoliday(id: string) {
  return http.get<Holiday>(`/holidays/${id}`)
}

export function updateHoliday(id: string, body: Partial<Omit<HolidayPayload, 'companyId'>>) {
  return http.patch<Holiday>(`/holidays/${id}`, body)
}

export function deleteHoliday(id: string) {
  return http.delete<{ id: string; deleted: boolean }>(`/holidays/${id}`)
}
