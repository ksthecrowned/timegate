import { http } from '@/lib/http'

export type PlanningCalendarDay = {
  date: string
  assignments: Array<{
    id: string
    employee: { id: string; firstName: string; lastName: string }
    shiftType: { id: string; name: string; startTime: string; endTime: string }
    shiftLocation: { id: string; name: string } | null
    startDate: string | null
    endDate: string | null
    exception?: {
      id: string
      isOff: boolean
      startTime: string | null
      endTime: string | null
    } | null
  }>
  exceptions?: Array<{
    id: string
    isOff: boolean
    startTime: string | null
    endTime: string | null
    note: string | null
    shiftType: { id: string; name: string }
  }>
  leaves: Array<{
    id: string
    employee: { id: string; firstName: string; lastName: string }
    leaveType: string
    status: string
    fromDate: string | null
    toDate: string | null
  }>
  holidays: Array<{ id: string; name: string; holidayListName: string }>
}

export type PlanningCalendar = {
  from: string
  to: string
  branchId: string | null
  days: PlanningCalendarDay[]
}

export async function getPlanningCalendar(params: {
  from: string
  to: string
  branchId?: string
}) {
  return http.get<PlanningCalendar>('/planning/calendar', { params })
}
