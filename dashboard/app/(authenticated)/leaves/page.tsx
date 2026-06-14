'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import ActionButtons from '@/components/ui/ActionButtons'
import AddPageLink from '@/components/timegate/AddPageLink'
import { employeeTableColumn } from '@/components/timegate/employee-table-column'
import { dateTableColumn } from '@/components/timegate/date-table-column'
import { deleteLeave, listLeaves } from '@/lib/timegate/leaves'
import type { Leave } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

const columns: Column<Leave>[] = [
  employeeTableColumn<Leave>({ sortable: true }),
  dateTableColumn<Leave>('startDate', 'Date début', { sortable: true }),
  dateTableColumn<Leave>('endDate', 'Date fin', { sortable: true }),
  {
    key: 'leaveType',
    label: 'Type',
    render: (_, row) => row.leaveType?.leaveTypeName ?? row.type ?? '—',
  },
  {
    key: 'status',
    label: 'Statut',
    render: (_, row) => <StatusBadge status={row.status.toLowerCase()} />,
  },
  { key: 'reason', label: 'Motif' },
]

export default function LeavesPage() {
  const [data, setData] = useState<Leave[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData((await listLeaves({ page: 1, limit: 100 })).data)
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
        breadcrumbs={[{ label: 'Congés' }]}
        action={<AddPageLink href="/leaves/new" label="Ajouter un congé" />}
      />
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}
      <DataTable
          loading={loading}
          data={data}
          columns={columns}
          entityLabel="congés"
          tableId="hs-leaves-table"
          emptyMessage="Aucun congé trouvé."
          actions={(row) => (
            <ActionButtons
              viewHref={`/leaves/${row.id}`}
              editHref={`/leaves/${row.id}/edit`}
              onDelete={() => {
                void deleteLeave(row.id).then(load)
              }}
            />
          )}
        />
    </div>
  )
}
