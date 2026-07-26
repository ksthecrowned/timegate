import { http } from '@/lib/http'
import type { EmployeeSummary } from '@/lib/timegate/types'

export type TeamMemberStatus =
  | 'PRESENT'
  | 'ABSENT'
  | 'LATE'
  | 'ON_BREAK'
  | 'ON_LEAVE'
  | 'REVIEW_REQUIRED'
  | 'OFF'
  | 'EXPECTED'

export type TeamTodayMember = {
  employeeId: string
  employeeName: string
  employee?: EmployeeSummary | null
  branch?: { id: string; name: string } | null
  department?: string | null
  status: TeamMemberStatus
  lateMinutes: number
  workedMinutes: number
  pendingReviewEvents: number
  lastEventAt: string | null
  lastEventType: string | null
}

export type TeamTodayResponse = {
  date: string
  branchId: string | null
  summary: {
    total: number
    present: number
    absent: number
    late: number
    onBreak: number
    onLeave: number
    reviewRequired: number
    off: number
    expected: number
  }
  members: TeamTodayMember[]
}

export type InboxItemType =
  | 'ATTENDANCE_EVENT'
  | 'TIMESHEET_DAY'
  | 'LEAVE'
  | 'SHIFT_SWAP'
  | 'PUNCH_CLAIM'

export type ManagerInboxItem = {
  id: string
  type: InboxItemType
  title: string
  subtitle: string
  employee?: EmployeeSummary | null
  createdAt: string
  href: string
  meta?: Record<string, unknown>
}

export type ManagerInboxResponse = {
  counts: {
    attendanceEvents: number
    timesheetDays: number
    leaves: number
    shiftSwaps: number
    punchClaims: number
    total: number
  }
  items: ManagerInboxItem[]
}

export function getManagerTeamToday(params?: { date?: string; branchId?: string }) {
  return http.get<TeamTodayResponse>('/manager/team-today', { params })
}

export function getManagerInbox(params?: { branchId?: string; limit?: number }) {
  return http.get<ManagerInboxResponse>('/manager/inbox', { params })
}

export function bulkReviewAttendanceEvents(body: {
  eventIds: string[]
  status: 'ACCEPTED' | 'REJECTED'
  reason?: string
}) {
  return http.post<{
    reviewed: number
    failed: number
    data: unknown[]
    errors: Array<{ id: string; message: string }>
  }>('/manager/review-events/bulk', body)
}

export const TEAM_STATUS_LABELS: Record<TeamMemberStatus, string> = {
  PRESENT: 'Présent',
  ABSENT: 'Absent',
  LATE: 'Retard',
  ON_BREAK: 'En pause',
  ON_LEAVE: 'Congé',
  REVIEW_REQUIRED: 'À valider',
  OFF: 'Repos / férié',
  EXPECTED: 'Prévu',
}

export const INBOX_TYPE_LABELS: Record<InboxItemType, string> = {
  ATTENDANCE_EVENT: 'Pointage',
  TIMESHEET_DAY: 'Journée',
  LEAVE: 'Congé',
  SHIFT_SWAP: 'Échange shift',
  PUNCH_CLAIM: 'Réclamation',
}
