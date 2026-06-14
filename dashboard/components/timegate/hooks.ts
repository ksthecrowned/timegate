'use client'

import { useSession } from 'next-auth/react'
import type { EmployeeSummary } from '@/lib/timegate/types'
import { employeeDisplayName } from '@/lib/timegate/employee-display'

export function useCompanyId(): string | null {
  const { data: session } = useSession()
  return session?.user?.companyId ?? null
}

export function employeeLabel(employee?: EmployeeSummary | null): string {
  return employeeDisplayName(employee)
}

export async function findInPaginatedList<T extends { id: string }>(
  loader: () => Promise<{ data: T[] }>,
  id: string,
): Promise<T | null> {
  const res = await loader()
  return res.data.find((row) => row.id === id) ?? null
}
