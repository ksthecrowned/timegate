'use client'

import { useEffect, useState } from 'react'
import { DetailCard } from '@/components/timegate/ui'
import { getEmployeeLeaveBalances, type EmployeeLeaveBalances } from '@/lib/timegate/employees'
import { HttpError } from '@/lib/http'

export default function EmployeeLeaveBalancesCard({ employeeId }: { employeeId: string }) {
  const [data, setData] = useState<EmployeeLeaveBalances | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError('')
    void getEmployeeLeaveBalances(employeeId)
      .then(setData)
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [employeeId])

  return (
    <DetailCard title={`Soldes congés ${data?.year ?? new Date().getFullYear()}`}>
      {loading && <p className="text-sm text-slate-500 px-5 py-3">Chargement…</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {!loading && !error && data && (
        <dl className="space-y-3">
          {data.balances.map((balance) => (
            <div
              key={balance.leaveTypeId}
              className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 dark:border-border-dark px-5 py-3 last:border-0"
            >
              <dt className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {balance.leaveTypeName}
              </dt>
              <dd className="text-sm text-slate-600 dark:text-slate-400">
                {balance.unlimited
                  ? 'Illimité'
                  : `${balance.remaining ?? 0} restant(s) · ${balance.used} utilisé(s) · ${balance.allocated} alloué(s)`}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </DetailCard>
  )
}
