'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ApiErrorBanner, DetailCard } from '@/components/timegate/ui'
import { HttpError } from '@/lib/http'
import { formatMoney } from '@/lib/money'
import { getEmployeeCompensationSummary } from '@/lib/timegate/employees'
import type { EmployeeCompensationSummary } from '@/lib/timegate/types'
import { MONTH_LABELS } from '@/lib/timegate/payroll-runs'
import StatusBadge from '@/components/ui/StatusBadge'

function baseSourceLabel(source: EmployeeCompensationSummary['baseSource']) {
  if (source === 'GRID') return 'Grille de compensation'
  if (source === 'CTC') return 'CTC / 12'
  return 'Non défini'
}

function runStatusBadge(status: string | null) {
  if (!status) return null
  const map: Record<string, string> = {
    DRAFT: 'Brouillon',
    LOCKED: 'Verrouillé',
    PARTIALLY_PAID: 'Partiellement payé',
    PAID: 'Payé',
  }
  return <StatusBadge status={map[status] ?? status} />
}

export default function EmployeeCompensationSummaryCard({
  employeeId,
  refreshKey,
}: {
  employeeId: string
  refreshKey?: number
}) {
  const [summary, setSummary] = useState<EmployeeCompensationSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setSummary(await getEmployeeCompensationSummary(employeeId))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Rémunération indisponible.')
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const last = summary?.lastMonth
  const lastLabel =
    last != null
      ? `${MONTH_LABELS[last.month - 1] ?? last.month} ${last.year}`
      : null

  return (
    <DetailCard title="Rémunération mensuelle">
      <ApiErrorBanner message={error} />
      {loading ? (
        <div className="px-4 py-4 text-sm text-slate-500 dark:text-slate-400 md:px-5">
          Chargement…
        </div>
      ) : summary ? (
        <div className="divide-y divide-slate-200/80 dark:divide-border-dark">
          <div className="grid gap-4 px-4 py-4 sm:grid-cols-3 md:px-5">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Salaire de base
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                {formatMoney(summary.baseSalary, summary.currency)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {baseSourceLabel(summary.baseSource)}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Indemnités fixes
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                {summary.fixedAllowances
                  ? `+${formatMoney(summary.fixedAllowances, summary.currency)}`
                  : formatMoney(0, summary.currency)}
              </p>
              {summary.fixedDeductions > 0 ? (
                <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">
                  Retenues −{formatMoney(summary.fixedDeductions, summary.currency)}
                </p>
              ) : (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Récurrentes</p>
              )}
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Mensuel fixe
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-primary">
                {formatMoney(summary.fixedMonthly, summary.currency)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Base + indemnités
                {summary.fixedDeductions > 0
                  ? ` · net ${formatMoney(summary.fixedMonthlyNet, summary.currency)}`
                  : ''}
              </p>
            </div>
          </div>

          {(summary.allowances.length > 0 || summary.deductions.length > 0) && (
            <div className="grid gap-4 px-4 py-3 sm:grid-cols-2 md:px-5">
              {summary.allowances.length > 0 ? (
                <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
                  {summary.allowances.map((item) => (
                    <li key={item.label} className="flex justify-between gap-3">
                      <span className="truncate">{item.label}</span>
                      <span className="shrink-0 tabular-nums text-emerald-600 dark:text-emerald-400">
                        +{formatMoney(item.amount, summary.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {summary.deductions.length > 0 ? (
                <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-200">
                  {summary.deductions.map((item) => (
                    <li key={item.label} className="flex justify-between gap-3">
                      <span className="truncate">{item.label}</span>
                      <span className="shrink-0 tabular-nums text-red-600 dark:text-red-400">
                        −{formatMoney(item.amount, summary.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}

          <div className="px-4 py-4 md:px-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Mois dernier{lastLabel ? ` · ${lastLabel}` : ''}
                </p>
                {last?.runId && last.net != null ? (
                  <>
                    <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                      {formatMoney(last.net, summary.currency)}
                      <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                        net
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      Brut {formatMoney(last.gross ?? 0, summary.currency)}
                      {last.paymentStatus === 'PAID' ? ' · payé' : ' · non payé'}
                    </p>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Aucun cycle de paie pour cette période.
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {last?.runStatus ? runStatusBadge(last.runStatus) : null}
                {last?.runId ? (
                  <Link
                    href={`/payroll-runs/${last.runId}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Voir le cycle
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </DetailCard>
  )
}
