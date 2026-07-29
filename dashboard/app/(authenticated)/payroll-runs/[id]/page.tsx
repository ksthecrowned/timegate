'use client'

import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import { employeeTableColumn } from '@/components/timegate/employee-table-column'
import PayrollVariableItemsCard from '@/components/timegate/PayrollVariableItemsCard'
import {
  ApiErrorBanner,
  DetailCard,
  DetailRow,
  primaryBtnClass,
  secondaryBtnClass,
} from '@/components/timegate/ui'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import {
  exportPayrollRun,
  getPayrollRun,
  getPayrollRunLines,
  lockPayrollRun,
  markPayrollRunPaid,
  MONTH_LABELS,
} from '@/lib/timegate/payroll-runs'
import { toSelectOptions } from '@/lib/select-options'
import type { EmployeeSummary, PayrollLine, PayrollRun } from '@/lib/timegate/types'
import { employeeDisplayName } from '@/lib/timegate/employee-display'
import { HttpError } from '@/lib/http'

function formatMoney(value: number): string {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function formatSigned(value: number): string {
  if (!value) return '—'
  const formatted = formatMoney(Math.abs(value))
  return value > 0 ? `+${formatted}` : `-${formatted}`
}

function signedClass(value: number): string {
  if (!value) return 'text-gray-500 dark:text-neutral-400'
  return value > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
}

function payrollStatusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'pending',
    LOCKED: 'processing',
    PAID: 'completed',
  }
  return <StatusBadge status={map[status] ?? status.toLowerCase()} />
}

export default function PayrollRunDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [run, setRun] = useState<PayrollRun | null>(null)
  const [lines, setLines] = useState<PayrollLine[]>([])
  const [explainLine, setExplainLine] = useState<PayrollLine | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  const employeeOptions = useMemo(
    () =>
      toSelectOptions(
        lines.map((line) => ({
          id: line.employeeId,
          name: employeeDisplayName(line.employee),
        })),
      ),
    [lines],
  )

  const employeesById = useMemo(() => {
    const map = new Map<string, EmployeeSummary | null | undefined>()
    for (const line of lines) map.set(line.employeeId, line.employee)
    return map
  }, [lines])

  const lineColumns: Column<PayrollLine>[] = useMemo(
    () => [
      employeeTableColumn<PayrollLine>(),
      {
        key: 'baseSalary',
        label: 'Base',
        render: (_, row) => formatMoney(row.baseSalary),
      },
      {
        key: 'fixedNet',
        label: 'Maj. fixes',
        render: (_, row) => {
          const net = row.fixedAllowancesTotal - row.fixedDeductionsTotal
          return <span className={signedClass(net)}>{formatSigned(net)}</span>
        },
      },
      {
        key: 'variableNet',
        label: 'Variables',
        render: (_, row) => {
          const net = row.variableAllowancesTotal - row.variableDeductionsTotal
          return <span className={signedClass(net)}>{formatSigned(net)}</span>
        },
      },
      {
        key: 'lateMinutesPenalty',
        label: 'Retards',
        render: (_, row) => (row.lateMinutesPenalty ? `-${formatMoney(row.lateMinutesPenalty)}` : '—'),
      },
      {
        key: 'absenceAmount',
        label: 'Absences',
        render: (_, row) => (row.absenceAmount ? `-${formatMoney(row.absenceAmount)}` : '—'),
      },
      {
        key: 'overtimeAmount',
        label: 'HS',
        render: (_, row) => (row.overtimeAmount ? `+${formatMoney(row.overtimeAmount)}` : '—'),
      },
      {
        key: 'gross',
        label: 'Brut',
        render: (_, row) => formatMoney(row.gross),
      },
      {
        key: 'netSalary',
        label: 'Net',
        render: (_, row) => <span className="font-semibold">{formatMoney(row.netSalary)}</span>,
      },
      {
        key: 'explainJson',
        label: 'Calcul',
        render: (_, row) =>
          row.explainJson ? (
            <button
              type="button"
              className="text-primary hover:underline text-sm"
              onClick={() => setExplainLine(explainLine?.id === row.id ? null : row)}
            >
              {explainLine?.id === row.id ? 'Masquer' : 'Voir'}
            </button>
          ) : (
            '—'
          ),
      },
    ],
    [explainLine],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [runRes, linesRes] = await Promise.all([
        getPayrollRun(id),
        getPayrollRunLines(id, { limit: 100 }),
      ])
      setRun(runRes)
      setLines(linesRes.data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Paie introuvable.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function handleLock() {
    setActionLoading(true)
    setError('')
    try {
      await lockPayrollRun(id)
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Verrouillage impossible.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleMarkPaid() {
    setActionLoading(true)
    setError('')
    try {
      await markPayrollRunPaid(id)
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Marquage impossible.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleExport() {
    setActionLoading(true)
    setError('')
    try {
      const res = await exportPayrollRun(id)
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = res.filename || `paie-${id}.csv`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Export impossible.')
    } finally {
      setActionLoading(false)
    }
  }

  const periodLabel = run
    ? `${MONTH_LABELS[run.month - 1] ?? run.month} ${run.year}`
    : 'Détail'

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Paies', href: '/payroll-runs' },
          { label: periodLabel },
        ]}
        action={
          run && (
            <div className="flex flex-wrap gap-2">
              {run.status === 'DRAFT' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void handleLock()}
                  className={primaryBtnClass}
                >
                  Verrouiller
                </button>
              )}
              {run.status === 'LOCKED' && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => void handleMarkPaid()}
                  className={primaryBtnClass}
                >
                  Marquer payée
                </button>
              )}
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void handleExport()}
                className={secondaryBtnClass}
              >
                Exporter CSV
              </button>
            </div>
          )
        }
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <div className="space-y-6">
          <SkeletonDetailCard rows={5} />
          <DataTable
            loading
            data={[]}
            columns={lineColumns}
            entityLabel="lignes"
            tableId="hs-payroll-lines-skeleton"
            emptyMessage=""
          />
        </div>
      ) : run ? (
        <div className="space-y-6">
          <DetailCard title={`Paie — ${periodLabel}`}>
            <DetailRow label="Période" value={periodLabel} />
            <DetailRow label="Statut" value={payrollStatusBadge(run.status)} />
            <DetailRow label="Version règles" value={run.ruleVersion ?? '—'} />
            <DetailRow
              label="Créée le"
              value={new Date(run.createdAt).toLocaleString('fr-FR')}
            />
            {run.lockedAt && (
              <DetailRow
                label="Verrouillée le"
                value={new Date(run.lockedAt).toLocaleString('fr-FR')}
              />
            )}
            {run.paidAt && (
              <DetailRow
                label="Payée le"
                value={new Date(run.paidAt).toLocaleString('fr-FR')}
              />
            )}
          </DetailCard>

          {run.status === 'DRAFT' && (
            <PayrollVariableItemsCard
              runId={id}
              employeeOptions={employeeOptions}
              employeesById={employeesById}
            />
          )}

          <div>
            <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-white">
              Lignes de paie
            </h3>
            <DataTable
              data={lines}
              columns={lineColumns}
              entityLabel="lignes"
              tableId="hs-payroll-lines-table"
              emptyMessage="Aucune ligne de paie."
            />
            {explainLine?.explainJson && (
              <div className="mt-4 p-4 bg-gray-50 border border-slate-200/80 rounded-xl dark:bg-surface-card-dark dark:border-border-dark">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-800 dark:text-neutral-200">
                    Détail du calcul — {employeeDisplayName(explainLine.employee)}
                  </h4>
                  <button
                    type="button"
                    className="text-sm text-gray-500 hover:text-gray-700"
                    onClick={() => setExplainLine(null)}
                  >
                    Fermer
                  </button>
                </div>
                <pre className="text-xs overflow-auto text-gray-700 dark:text-neutral-300">
                  {JSON.stringify(explainLine.explainJson, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
