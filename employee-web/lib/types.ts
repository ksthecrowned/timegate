export type EmployeeProfile = {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  status: string
  branchId?: string | null
  branchName?: string | null
  defaultShiftName?: string | null
  companyId: string
}

export type EmployeeCheckin = {
  id: string
  type: 'CHECK_IN' | 'CHECK_OUT'
  timestamp: string
  kiosk?: { id: string; name: string; branchId?: string } | null
}

export type EmployeeLeave = {
  id: string
  startDate: string
  endDate: string
  status: string
  reason?: string | null
  leaveTypeId?: string
  type?: string
}

export type LeaveBalance = {
  leaveTypeId: string
  leaveTypeName: string
  year: number
  allocated: number | null
  used: number
  remaining: number | null
  unlimited: boolean
}

export type EmployeeLeaveBalances = {
  employeeId: string
  year: number
  balances: LeaveBalance[]
}

export type LeaveType = {
  id: string
  name: string
  leaveTypeName: string
  maxDaysPerYear?: number | null
}

export type PaginatedResponse<T> = {
  data: T[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

export type LoginResponse = {
  access_token: string
  employee: {
    id: string
    firstName: string
    lastName: string
    branchId?: string | null
    branchName?: string | null
  }
}
