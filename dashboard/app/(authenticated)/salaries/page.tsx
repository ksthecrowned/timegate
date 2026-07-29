'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import ActionButtons from '@/components/ui/ActionButtons'
import { employeeTableColumn } from '@/components/timegate/employee-table-column'
import { listSalaries } from '@/lib/timegate/salaries'
import { MONTH_LABELS } from '@/lib/timegate/payroll-runs'
import type { Salary } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

function formatMoney(value: number): string {
  return value.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function salaryStatusBadge(status: string) {
  const map: Record<string, string> = {
    PENDING: 'pending',
    PAID: 'completed',
  }
  return <StatusBadge status={map[status] ?? status.toLowerCase()} />
}

const columns: Column<Salary>[] = [
  employeeTableColumn<Salary>({ sortable: true }),
  {
    key: 'month',
    label: 'Période',
    sortable: true,
    render: (_, row) => `${MONTH_LABELS[row.month - 1] ?? row.month} ${row.year}`,
  },
  {
    key: 'baseSalary',
    label: 'Base',
    render: (_, row) => formatMoney(row.baseSalary),
  },
  {
    key: 'netSalary',
    label: 'Net',
    render: (_, row) => formatMoney(row.netSalary),
  },
  {
    key: 'status',
    label: 'Statut',
    render: (_, row) => salaryStatusBadge(row.status),
  },
]

export default function SalariesPage() {
  const [data, setData] = useState<Salary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData((await listSalaries({ page: 1, limit: 100 })).data)
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
      <PageHeader breadcrumbs={[{ label: 'Rémunérations de base' }]} />
      <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 p-4 mb-6">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Module en transition.</strong> Les rémunérations de base sont désormais gérées via la{' '}
          <a href="/compensation-grid" className="underline font-medium">
            Grille de rémunération
          </a>
          . Les données ci-dessous sont conservées en lecture seule.
        </p>
      </div>
      <p className="mb-4 text-sm text-gray-500 dark:text-neutral-400">
        Base / primes / retenues saisies pour le mois. Le calcul du cycle (HS, absences…) se fait
        dans{' '}
        <a href="/payroll-runs" className="text-primary hover:underline">
          Cycles de paie
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
          entityLabel="salaires"
          tableId="hs-salaries-table"
          emptyMessage="Aucun salaire trouvé."
          actions={(row) => <ActionButtons viewHref={`/salaries/${row.id}`} />}
        />
    </div>
  )
}
