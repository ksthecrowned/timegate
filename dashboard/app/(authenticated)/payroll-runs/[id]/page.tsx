'use client'

import { formatApiDateTime } from '@/lib/date-utils'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import PayrollVariableItemsCard from '@/components/timegate/PayrollVariableItemsCard'
import PayrollRunMassBanner from '@/components/timegate/PayrollRunMassBanner'
import PayrollLinesPaymentTable from '@/components/timegate/PayrollLinesPaymentTable'
import PayrollBranchPaymentSummary from '@/components/timegate/PayrollBranchPaymentSummary'
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
  lockPayrollRun,
  markLinesPaid,
  MONTH_LABELS,
  regeneratePayrollRun,
} from '@/lib/timegate/payroll-runs'
import { toSelectOptions } from '@/lib/select-options'
import type { EmployeeSummary, PayrollLine, PayrollRun } from '@/lib/timegate/types'
import { employeeDisplayName } from '@/lib/timegate/employee-display'
import { HttpError } from '@/lib/http'

function payrollStatusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'Brouillon',
    LOCKED: 'Verrouillé',
    PARTIALLY_PAID: 'Partiellement payé',
    PAID: 'Payé',
  }
  return <StatusBadge status={map[status] ?? status} />
}

export default function PayrollRunDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [run, setRun] = useState<PayrollRun | null>(null)
  const [lines, setLines] = useState<PayrollLine[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentTableRefreshKey, setPaymentTableRefreshKey] = useState(0)
  const [branchSummaryRefreshKey, setBranchSummaryRefreshKey] = useState(0)

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

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRun(await getPayrollRun(id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Paie introuvable.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const handleLinesLoaded = useCallback((next: PayrollLine[]) => {
    setLines(next)
  }, [])

  async function handleLock() {
    setActionLoading(true)
    setError('')
    try {
      await lockPayrollRun(id)
      await load()
      setPaymentTableRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Verrouillage impossible.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleRegenerate() {
    if (
      !window.confirm(
        'Recalculer ce cycle avec les absences, retards et congés à jour ? Les lignes actuelles seront remplacées.',
      )
    ) {
      return
    }
    setActionLoading(true)
    setError('')
    try {
      await regeneratePayrollRun(id)
      await load()
      setPaymentTableRefreshKey((k) => k + 1)
      setBranchSummaryRefreshKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Recalcul impossible.')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleMarkAllUnpaid() {
    if (!window.confirm('Marquer toutes les lignes non payées comme payées ?')) return
    setActionLoading(true)
    setError('')
    try {
      const unpaidIds = lines
        .filter((l) => l.paymentStatus !== 'PAID')
        .map((l) => l.id)
      if (unpaidIds.length === 0) return
      await markLinesPaid(id, { lineIds: unpaidIds })
      await load()
      setPaymentTableRefreshKey((k) => k + 1)
      setBranchSummaryRefreshKey((k) => k + 1)
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
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.filename || `payroll-${id}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Export impossible.')
    } finally {
      setActionLoading(false)
    }
  }

  function handlePaymentTableChanged() {
    void load()
    setBranchSummaryRefreshKey((k) => k + 1)
  }

  const periodLabel = run
    ? `${MONTH_LABELS[run.month - 1] ?? run.month} ${run.year}`
    : '…'

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Cycles de paie', href: '/payroll-runs' },
          { label: periodLabel },
        ]}
        action={
          run ? (
            <div className="flex flex-wrap gap-2">
              {run.status === 'DRAFT' && (
                <>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void handleRegenerate()}
                    className={secondaryBtnClass}
                  >
                    Recalculer
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void handleLock()}
                    className={primaryBtnClass}
                  >
                    Verrouiller
                  </button>
                </>
              )}
              {(run.status === 'LOCKED' || run.status === 'PARTIALLY_PAID') &&
                (run.paymentProgress?.unpaidCount ?? 0) > 0 && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => void handleMarkAllUnpaid()}
                    className={primaryBtnClass}
                  >
                    Marquer toutes les lignes non payées
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
          ) : null
        }
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <div className="space-y-6">
          <SkeletonDetailCard rows={5} />
        </div>
      ) : run ? (
        <div className="space-y-6">
          <DetailCard title={`Paie — ${periodLabel}`}>
            <DetailRow label="Période" value={periodLabel} />
            <DetailRow label="Statut" value={payrollStatusBadge(run.status)} />
            <DetailRow label="Créée le" value={formatApiDateTime(run.createdAt)} />
            {run.lockedAt && (
              <DetailRow label="Verrouillée le" value={formatApiDateTime(run.lockedAt)} />
            )}
            {run.paidAt && (
              <DetailRow label="Payée le" value={formatApiDateTime(run.paidAt)} />
            )}
          </DetailCard>

          <PayrollRunMassBanner run={run} />

          {run.status === 'DRAFT' && (
            <PayrollVariableItemsCard
              runId={id}
              employeeOptions={employeeOptions}
              employeesById={employeesById}
            />
          )}

          <PayrollLinesPaymentTable
            runId={id}
            runStatus={run.status}
            refreshKey={paymentTableRefreshKey}
            onChanged={handlePaymentTableChanged}
            onLinesLoaded={handleLinesLoaded}
          />

          <PayrollBranchPaymentSummary
            runId={id}
            refreshKey={branchSummaryRefreshKey}
            employeesById={employeesById}
          />
        </div>
      ) : null}
    </div>
  )
}
