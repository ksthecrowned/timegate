'use client'

import AddPageLink from '@/components/timegate/AddPageLink'
import { dateTimeTableColumn } from '@/components/timegate/date-table-column'
import { ApiErrorBanner } from '@/components/timegate/ui'
import ActionButtons from '@/components/ui/ActionButtons'
import DataTable, { Column } from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import { HttpError } from '@/lib/http'
import { formatMoney, listPayrollRuns, MONTH_LABELS } from '@/lib/timegate/payroll-runs'
import type { PayrollRun } from '@/lib/timegate/types'
import { useCallback, useEffect, useMemo, useState } from 'react'

type StatusFilter = PayrollRun['status'] | 'ALL'

const STATUS_FILTERS: Array<{ key: StatusFilter; label: string; icon: string }> = [
  { key: 'ALL', label: 'Tous', icon: 'fa-layer-group' },
  { key: 'DRAFT', label: 'Brouillon', icon: 'fa-file-pen' },
  { key: 'LOCKED', label: 'Verrouillé', icon: 'fa-lock' },
  { key: 'PARTIALLY_PAID', label: 'Partiellement payé', icon: 'fa-circle-half-stroke' },
  { key: 'PAID', label: 'Payé', icon: 'fa-circle-check' },
]

function payrollStatusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'Brouillon',
    LOCKED: 'Verrouillé',
    PARTIALLY_PAID: 'Partiellement payé',
    PAID: 'Payé',
  }
  return <StatusBadge status={map[status] ?? status} />
}

function paymentProgressCell(row: PayrollRun) {
  const progress = row.paymentProgress
  if (!progress || progress.linesCount === 0) return '—'
  const percent = Math.min(100, Math.max(0, progress.percentPaid ?? 0))
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
      </div>
      <span className="whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
        {progress.paidCount}/{progress.linesCount}
      </span>
    </div>
  )
}

const columns: Column<PayrollRun>[] = [
  {
    key: 'month',
    label: 'Période',
    sortable: true,
    render: (_, row) => `${MONTH_LABELS[row.month - 1] ?? row.month} ${row.year}`,
  },
  {
    key: 'status',
    label: 'Statut',
    render: (_, row) => payrollStatusBadge(row.status),
  },
  {
    key: '_count',
    label: 'Lignes',
    render: (_, row) => row._count?.lines ?? '—',
  },
  {
    key: 'totalsGross',
    label: 'Brut',
    render: (_, row) => (row.totals ? formatMoney(row.totals.gross) : '—'),
  },
  {
    key: 'totalsNet',
    label: 'Net',
    render: (_, row) => (row.totals ? formatMoney(row.totals.net) : '—'),
  },
  {
    key: 'paymentProgress',
    label: 'Paiement',
    render: (_, row) => paymentProgressCell(row),
  },
  dateTimeTableColumn<PayrollRun>('createdAt', 'Créée le'),
]

export default function PayrollRunsPage() {
  const [data, setData] = useState<PayrollRun[]>([])
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData((await listPayrollRuns({ page: 1, limit: 100 })).data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(
    () => (statusFilter === 'ALL' ? data : data.filter((row) => row.status === statusFilter)),
    [data, statusFilter],
  )

  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = {
      ALL: data.length,
      DRAFT: 0,
      LOCKED: 0,
      PARTIALLY_PAID: 0,
      PAID: 0,
    }
    for (const row of data) base[row.status] += 1
    return base
  }, [data])

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Cycles de paie' }]}
        action={<AddPageLink href="/payroll-runs/new" label="Nouveau cycle" />}
      />
      <ApiErrorBanner message={error} />

      <div className="overflow-x-auto border-b border-slate-200/80 dark:border-border-dark mb-4">
        <nav
          className="flex min-w-max gap-0 px-1"
          role="tablist"
          aria-label="Filtrer par statut"
        >
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.key
            const count = counts[f.key]
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStatusFilter(f.key)}
                className={`relative inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100'
                }`}
              >
                <i className={`fa-solid ${f.icon} text-xs opacity-70`} aria-hidden />
                {f.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                    active
                      ? 'bg-primary/15 text-primary'
                      : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </nav>
      </div>

      <DataTable
        loading={loading}
        data={filtered}
        columns={columns}
        entityLabel="paies"
        tableId="hs-payroll-runs-table"
        emptyMessage="Aucune paie trouvée pour ce filtre."
        actions={(row) => <ActionButtons viewHref={`/payroll-runs/${row.id}`} />}
      />
    </div>
  )
}
