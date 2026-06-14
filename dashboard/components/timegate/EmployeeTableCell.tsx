'use client'

import {
  employeeDisplayName,
  resolveEmployeePhotoUrl,
} from '@/lib/timegate/employee-display'
import type { EmployeeSummary } from '@/lib/timegate/types'

type EmployeeTableCellProps = {
  employee?: EmployeeSummary | null
  fallbackName?: string | null
  compact?: boolean
}

export default function EmployeeTableCell({
  employee,
  fallbackName,
  compact = false,
}: EmployeeTableCellProps) {
  const name = employeeDisplayName(employee, fallbackName)
  const photoUrl = resolveEmployeePhotoUrl(employee?.photoUrl)
  const sizeClass = compact ? 'size-8' : 'size-9'

  return (
    <div className="flex items-center gap-x-3 min-w-0">
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={name}
          className={`${sizeClass} shrink-0 rounded-full object-cover bg-gray-100 dark:bg-neutral-700`}
        />
      ) : (
        <span
          className={`inline-flex ${sizeClass} shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-neutral-700 dark:text-neutral-300`}
          aria-hidden
        >
          <i className="fa-solid fa-user text-sm" />
        </span>
      )}
      <span className="font-medium text-gray-800 dark:text-neutral-200 truncate">{name}</span>
    </div>
  )
}
