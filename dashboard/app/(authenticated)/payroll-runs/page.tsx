'use client'

import AddPageLink from '@/components/timegate/AddPageLink'
import { dateTimeTableColumn } from '@/components/timegate/date-table-column'
import { secondaryBtnClass } from '@/components/timegate/ui'
import ActionButtons from '@/components/ui/ActionButtons'
import DataTable, { Column } from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import { SelectSearch } from '@/components/ui/SelectSearch'
import type { SelectOption } from '@/components/ui/select-search-types'
import StatusBadge from '@/components/ui/StatusBadge'
import { findOption } from '@/lib/select-options'
import { HttpError } from '@/lib/http'
import { formatMoney, listPayrollRuns, MONTH_LABELS } from '@/lib/timegate/payroll-runs'
import type { PayrollRun } from '@/lib/timegate/types'
import { useCallback, useEffect, useState } from 'react'

const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'Tous les statuts' },
  { value: 'DRAFT', label: 'Brouillon' },
  { value: 'LOCKED', label: 'Verrouillé' },
  { value: 'PARTIALLY_PAID', label: 'Partiellement payé' },
  { value: 'PAID', label: 'Payé' },
]

function payrollStatusBadge(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'pending',
    LOCKED: 'processing',
    PARTIALLY_PAID: 'processing',
    PAID: 'completed',
  }
  return <StatusBadge status={map[status] ?? status.toLowerCase()} />
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
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(
        (
          await listPayrollRuns({
            page: 1,
            limit: 100,
            ...(status ? { status } : {}),
          })
        ).data,
      )
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Cycles de paie' }]}
        action={<AddPageLink href="/payroll-runs/new" label="Nouveau cycle" />}
      />
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-48 sm:max-w-56">
          <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Statut
          </label>
          <SelectSearch
            instanceId="payroll-runs-status"
            variant="toolbar"
            options={STATUS_OPTIONS}
            value={findOption(STATUS_OPTIONS, status) ?? STATUS_OPTIONS[0]}
            onChange={(opt) => setStatus(opt?.value ?? '')}
          />
        </div>
        {status ? (
          <button type="button" onClick={() => setStatus('')} className={`${secondaryBtnClass} py-2! px-3! text-xs`}>
            Réinitialiser
          </button>
        ) : null}
      </div>
      <DataTable
        loading={loading}
        data={data}
        columns={columns}
        entityLabel="paies"
        tableId="hs-payroll-runs-table"
        emptyMessage="Aucune paie trouvée."
        actions={(row) => <ActionButtons viewHref={`/payroll-runs/${row.id}`} />}
      />
    </div>
  )
}
