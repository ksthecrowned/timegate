import { http } from '@/lib/http'

export type PlanningVsActual = {
  from: string
  to: string
  plannedMinutes: number
  workedMinutes: number
  varianceMinutes: number
  coveragePercent: number | null
  byWeek: Array<{
    week: string
    label: string
    plannedMinutes: number
    workedMinutes: number
  }>
}

export function getPlanningVsActual(params: { from: string; to: string; branchId?: string }) {
  return http.get<PlanningVsActual>('/dashboard/planning-vs-actual', { params })
}
