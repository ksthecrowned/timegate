'use client'

import { Fragment, useCallback, useEffect, useState } from 'react'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { HttpError } from '@/lib/http'
import { employeeDisplayName } from '@/lib/timegate/employee-display'
import { formatMoney, getPaymentSummaryByBranch } from '@/lib/timegate/payroll-runs'
import type {
  EmployeeSummary,
  PayrollBranchPaymentSummary as BranchPaymentSummary,
} from '@/lib/timegate/types'

type Props = {
  runId: string
  refreshKey?: number
  employeesById?: Map<string, EmployeeSummary | null | undefined>
}

export default function PayrollBranchPaymentSummary({ runId, refreshKey, employeesById }: Props) {
  const [summary, setSummary] = useState<BranchPaymentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getPaymentSummaryByBranch(runId)
      setSummary(Array.isArray(res) ? res : [])
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Résumé par branche indisponible.')
    } finally {
      setLoading(false)
    }
  }, [runId])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  if (!loading && !error && summary.length === 0) return null

  return (
    <div className="tg-card border-t-4 border-t-primary mb-4">
      <div className="border-b border-slate-200/80 px-4 py-4 md:px-5 dark:border-border-dark">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Paiements par branche</h2>
      </div>

      <div className="px-4 pt-4 md:px-5">
        <ApiErrorBanner message={error} />
      </div>

      {loading ? (
        <p className="px-4 pb-4 text-sm text-slate-500 dark:text-slate-400 md:px-5">Chargement…</p>
      ) : (
        <div className="overflow-x-auto px-4 pb-4 md:px-5">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                <th className="py-2 pr-3 font-semibold">Branche</th>
                <th className="py-2 pr-3 font-semibold">Lignes</th>
                <th className="py-2 pr-3 font-semibold">Payées</th>
                <th className="py-2 pr-3 font-semibold">Non payées</th>
                <th className="py-2 pr-3 font-semibold">Brut</th>
                <th className="py-2 pr-3 font-semibold">Net</th>
                <th className="py-2 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {summary.map((branch) => {
                const key = branch.branchId ?? '__unassigned__'
                const isExpanded = expandedKey === key
                const unpaidNames =
                  branch.unpaidEmployees?.map((e) => e.name) ??
                  branch.unpaidEmployeeIds.map((employeeId) =>
                    employeesById?.get(employeeId)
                      ? employeeDisplayName(employeesById.get(employeeId))
                      : employeeId,
                  )
                return (
                  <Fragment key={key}>
                    <tr className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-2 pr-3">{branch.branchName ?? 'Sans branche'}</td>
                      <td className="py-2 pr-3">{branch.total}</td>
                      <td className="py-2 pr-3 text-emerald-600 dark:text-emerald-400">{branch.paid}</td>
                      <td className="py-2 pr-3 text-amber-600 dark:text-amber-400">{branch.unpaid}</td>
                      <td className="py-2 pr-3">{formatMoney(branch.gross)}</td>
                      <td className="py-2 pr-3 font-semibold">{formatMoney(branch.net)}</td>
                      <td className="py-2 text-right">
                        {branch.unpaid > 0 ? (
                          <button
                            type="button"
                            className="text-primary hover:underline text-sm"
                            onClick={() => setExpandedKey(isExpanded ? null : key)}
                          >
                            {isExpanded ? 'Masquer' : 'Détails'}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                    {isExpanded && branch.unpaid > 0 ? (
                      <tr className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-white/5">
                        <td colSpan={7} className="px-3 py-2 text-slate-600 dark:text-slate-300">
                          {unpaidNames.join(', ')}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
