import { http } from '@/lib/http'
import type { PlanningVsActual } from '@/lib/timegate/planning-vs-actual'

export type DashboardHomeRole = 'ADMIN' | 'MANAGER'

export type DashboardHomeToday = {
  total: number
  present: number
  absent: number
  onLeave: number
  late: number
  onBreak: number
  reviewRequired: number
  off: number
  reviewEventsToday: number
  inboxTotal: number
  inbox: {
    attendanceEvents: number
    timesheetDays: number
    leaves: number
    shiftSwaps: number
    punchClaims: number
    total: number
  }
  kiosksOffline: number
  kiosksTotal: number
}

export type DashboardHomeKpis = {
  employees: number
  branches: number
  kiosks: number
  absences30: number
  late30: number
  pendingLeaves: number
  timesheets30: number
  coveragePercent: number | null
  plannedMinutes: number
  workedMinutes: number
}

export type DashboardPayrollMass = {
  year: number
  month: number
  status: string
  runId: string
  totalGross: number
  totalNet: number
}

export type DashboardPayrollMassSeriesPoint = {
  year: number
  month: number
  totalGross: number
  status: string
}

export type DashboardHome = {
  role: DashboardHomeRole
  date: string
  today: DashboardHomeToday
  kpis: DashboardHomeKpis
  planningVsActual: PlanningVsActual
  payrollMass?: DashboardPayrollMass | null
  payrollMassSeries?: DashboardPayrollMassSeriesPoint[]
}

export function fetchDashboardHome() {
  return http.get<DashboardHome>('/dashboard/home')
}
