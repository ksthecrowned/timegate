import { getApiBaseUrl, getToken, clearSession } from '@/lib/auth'
import type {
  EmployeeCheckin,
  EmployeeLeave,
  EmployeeLeaveBalances,
  EmployeeProfile,
  LeaveType,
  PaginatedResponse,
} from '@/lib/types'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function parseError(res: Response): Promise<string> {
  const text = await res.text()
  if (!text) return `Erreur HTTP ${res.status}`
  try {
    const json = JSON.parse(text) as { message?: string | string[] }
    if (Array.isArray(json.message)) return json.message.join(', ')
    if (typeof json.message === 'string') return json.message
  } catch {
    return text
  }
  return text
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  if (!token) throw new ApiError('Session expirée. Reconnectez-vous.', 401)

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (res.status === 401) {
    clearSession()
    throw new ApiError('Session expirée. Reconnectez-vous.', 401)
  }

  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status)
  }

  return (await res.json()) as T
}

export function getEmployeeMe() {
  return apiFetch<EmployeeProfile>('/employee/me')
}

export function listEmployeeCheckins(params?: {
  page?: number
  limit?: number
  from?: string
  to?: string
}) {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.limit) search.set('limit', String(params.limit))
  if (params?.from) search.set('from', params.from)
  if (params?.to) search.set('to', params.to)
  const qs = search.toString()
  return apiFetch<PaginatedResponse<EmployeeCheckin>>(`/employee/checkins${qs ? `?${qs}` : ''}`)
}

export function listEmployeeLeaves(params?: {
  page?: number
  limit?: number
  from?: string
  to?: string
}) {
  const search = new URLSearchParams()
  if (params?.page) search.set('page', String(params.page))
  if (params?.limit) search.set('limit', String(params.limit))
  if (params?.from) search.set('from', params.from)
  if (params?.to) search.set('to', params.to)
  const qs = search.toString()
  return apiFetch<PaginatedResponse<EmployeeLeave>>(`/employee/leaves${qs ? `?${qs}` : ''}`)
}

export function createEmployeeLeave(payload: {
  startDate: string
  endDate: string
  reason?: string
  leaveTypeId?: string
}) {
  return apiFetch<EmployeeLeave>('/employee/leaves', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function getMyLeaveBalances(year?: number) {
  const qs = year ? `?year=${year}` : ''
  return apiFetch<EmployeeLeaveBalances>(`/employee/leave-balances${qs}`)
}

export function listEmployeeLeaveTypes() {
  return apiFetch<{ data: LeaveType[] }>('/employee/leave-types')
}
