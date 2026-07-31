import { fetchAllPages } from '@/lib/timegate/fetch-all-pages'
import { listAbsences } from '@/lib/timegate/absences'
import { listAttendanceDays } from '@/lib/timegate/attendance'
import { listLateRecords } from '@/lib/timegate/late-records'
import { lastNDaysRange } from '@/lib/timegate/period-range'
import { listTimesheets } from '@/lib/timegate/timesheets'
import { getPlanningVsActual, type PlanningVsActual } from '@/lib/timegate/planning-vs-actual'
import type { AttendanceDay, TimesheetDay } from '@/lib/timegate/types'
import { normalizeApiDate } from '@/lib/date-utils'

export type DashboardStats = {
  employees: number
  branches: number
  kiosks: number
  attendanceDays: number
  absences: number
  lateRecords: number
  pendingLeaves: number
  timesheetDays: number
}

export type DashboardChartData = {
  stats: DashboardStats
  planningVsActual: PlanningVsActual | null
  attendanceTrend: {
    categories: string[]
    present: number[]
    absent: number[]
  }
  statusBreakdown: { label: string; value: number }[]
  weeklyHours: {
    categories: string[]
    worked: number[]
  }
  weeklyIncidents: {
    categories: string[]
    late: number[]
    absent: number[]
  }
}

const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Présent',
  ABSENT: 'Absent',
  HALF_DAY: 'Demi-journée',
  ON_LEAVE: 'Congé',
  ON_HOLIDAY: 'Férié',
  // Legacy — télétravail retiré de l’UI ; on affiche comme Présent.
  WORK_FROM_HOME: 'Présent',
}

function shortDateLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function weekKey(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  const day = d.getDay() || 7
  d.setDate(d.getDate() + 4 - day)
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `S${week}`
}

function lastNDaysIso(days: number): string[] {
  const keys: string[] = []
  const cursor = new Date()
  cursor.setHours(12, 0, 0, 0)
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(cursor)
    d.setDate(cursor.getDate() - i)
    keys.push(d.toISOString().slice(0, 10))
  }
  return keys
}

function groupAttendanceByDay(days: AttendanceDay[]) {
  const present = new Map<string, number>()
  const absent = new Map<string, number>()
  const statusCounts = new Map<string, number>()

  for (const row of days) {
    const key = normalizeApiDate(row.date)
    if (!key) continue
    statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1)
    if (row.status === 'PRESENT' || row.status === 'WORK_FROM_HOME' || row.status === 'HALF_DAY') {
      present.set(key, (present.get(key) ?? 0) + 1)
    }
    if (row.status === 'ABSENT') {
      absent.set(key, (absent.get(key) ?? 0) + 1)
    }
  }

  return { present, absent, statusCounts }
}

function groupTimesheetsByWeek(rows: TimesheetDay[]) {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = normalizeApiDate(row.date)
    if (!key) continue
    const wk = weekKey(key)
    map.set(wk, (map.get(wk) ?? 0) + row.workedMinutes / 60)
  }
  return map
}

function groupIncidentsByWeek(dates: string[]) {
  const map = new Map<string, number>()
  for (const iso of dates) {
    const wk = weekKey(iso)
    map.set(wk, (map.get(wk) ?? 0) + 1)
  }
  return map
}

function sortedWeekKeys(...maps: Map<string, number>[]): string[] {
  const keys = new Set<string>()
  for (const map of maps) {
    map.forEach((_value, key) => keys.add(key))
  }
  return Array.from(keys).sort((a, b) => {
    const na = Number(a.slice(1))
    const nb = Number(b.slice(1))
    return na - nb
  })
}

export async function loadDashboardData(): Promise<DashboardChartData> {
  const statsRange = lastNDaysRange(30)

  const [
    statsDays,
    absences,
    lateRecords,
    timesheets,
  ] = await Promise.all([
    fetchAllPages((page) =>
      listAttendanceDays({ page, limit: 100, ...statsRange }),
    ),
    fetchAllPages((page) => listAbsences({ page, limit: 100, ...statsRange })),
    fetchAllPages((page) => listLateRecords({ page, limit: 100, ...statsRange })),
    fetchAllPages((page) => listTimesheets({ page, limit: 100, ...statsRange })),
  ])

  const trendKeys = lastNDaysIso(14)
  const { present, absent, statusCounts } = groupAttendanceByDay(statsDays)

  const weeklyHoursMap = groupTimesheetsByWeek(timesheets)
  const weeklyLateMap = groupIncidentsByWeek(
    lateRecords.map((r) => normalizeApiDate(r.date)).filter(Boolean),
  )
  const weeklyAbsentMap = groupIncidentsByWeek(
    absences.map((r) => normalizeApiDate(r.date)).filter(Boolean),
  )
  const weekCategories = sortedWeekKeys(weeklyHoursMap, weeklyLateMap, weeklyAbsentMap)

  let planningVsActual: PlanningVsActual | null = null
  try {
    planningVsActual = await getPlanningVsActual(statsRange)
  } catch {
    planningVsActual = null
  }

  return {
    stats: {
      employees: 0,
      branches: 0,
      kiosks: 0,
      attendanceDays: 0,
      absences: absences.length,
      lateRecords: lateRecords.length,
      pendingLeaves: 0,
      timesheetDays: timesheets.length,
    },
    planningVsActual,
    attendanceTrend: {
      categories: trendKeys.map(shortDateLabel),
      present: trendKeys.map((k) => present.get(k) ?? 0),
      absent: trendKeys.map((k) => absent.get(k) ?? 0),
    },
    statusBreakdown: Array.from(statusCounts.entries())
      .filter(([, value]) => value > 0)
      .map(([status, value]) => ({
        label: STATUS_LABELS[status] ?? status,
        value,
      }))
      .sort((a, b) => b.value - a.value),
    weeklyHours: {
      categories: weekCategories,
      worked: weekCategories.map((k) => Math.round((weeklyHoursMap.get(k) ?? 0) * 10) / 10),
    },
    weeklyIncidents: {
      categories: weekCategories,
      late: weekCategories.map((k) => weeklyLateMap.get(k) ?? 0),
      absent: weekCategories.map((k) => weeklyAbsentMap.get(k) ?? 0),
    },
  }
}
