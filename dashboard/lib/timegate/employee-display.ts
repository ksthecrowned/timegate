import type { EmployeeSummary } from '@/lib/timegate/types'

export function employeeDisplayName(
  employee?: EmployeeSummary | null,
  fallback?: string | null,
): string {
  if (employee) {
    const name = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim()
    if (name) return name
    if (employee.employeeName?.trim()) return employee.employeeName.trim()
  }
  return fallback?.trim() || '—'
}

export function resolveEmployeePhotoUrl(photoUrl?: string | null): string | null {
  if (!photoUrl?.trim()) return null
  const trimmed = photoUrl.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}
