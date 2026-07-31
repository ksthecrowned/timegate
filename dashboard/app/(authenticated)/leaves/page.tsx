'use client'

import AddPageLink from '@/components/timegate/AddPageLink'
import { dateTableColumn } from '@/components/timegate/date-table-column'
import { employeeTableColumn } from '@/components/timegate/employee-table-column'
import { ApiErrorBanner } from '@/components/timegate/ui'
import ActionButtons from '@/components/ui/ActionButtons'
import DataTable, { Column } from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import StatusBadge from '@/components/ui/StatusBadge'
import { HttpError } from '@/lib/http'
import { deleteLeave, listLeaves } from '@/lib/timegate/leaves'
import type { Leave } from '@/lib/timegate/types'
import { useCallback, useEffect, useState } from 'react'

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
        breadcrumbs={[{ label: 'Demandes de congé' }]}
        action={<AddPageLink href="/leaves/new" label="Ajouter un congé" />}
      />
      <ApiErrorBanner message={error} />
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
