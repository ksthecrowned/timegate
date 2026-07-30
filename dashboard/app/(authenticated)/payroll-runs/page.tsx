'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import ActionButtons from '@/components/ui/ActionButtons'
import AddPageLink from '@/components/timegate/AddPageLink'
import { formatMoney, listPayrollRuns, MONTH_LABELS } from '@/lib/timegate/payroll-runs'
import type { PayrollRun } from '@/lib/timegate/types'
import { dateTimeTableColumn } from '@/components/timegate/date-table-column'
import { HttpError } from '@/lib/http'

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

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Cycles de paie' }]}
        action={<AddPageLink href="/payroll-runs/new" label="Nouveau cycle" />}
      />
      <p className="mb-4 text-sm text-gray-500 dark:text-neutral-400">
        Calcul mensuel à partir de la grille salariale, des majorations employé et du temps
        travaillé. Bases contractuelles :{' '}
        <a href="/compensation-grid" className="text-primary hover:underline">
          Grille salariale
        </a>
        .
      </p>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}
      <DataTable
          loading={loading}
          data={data}
          columns={columns}
          entityLabel="paies"
          tableId="hs-payroll-runs-table"
          emptyMessage="Aucune paie trouvée."
          actions={(row) => (
            <ActionButtons viewHref={`/payroll-runs/${row.id}`} />
          )}
        />
    </div>
  )
}
