'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import ActionButtons from '@/components/ui/ActionButtons'
import AddPageLink from '@/components/timegate/AddPageLink'
import { deleteLeaveType, listLeaveTypes } from '@/lib/timegate/leave-types'
import type { LeaveType } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

const columns: Column<LeaveType>[] = [
  { key: 'name', label: 'Nom', sortable: true },
  {
    key: 'isLwp',
    label: 'Sans solde',
    render: (_, row) => (row.isLwp ? 'Oui' : 'Non'),
  },
  {
    key: 'isCarryForward',
    label: 'Reportable',
    render: (_, row) => (row.isCarryForward ? 'Oui' : 'Non'),
  },
]

export default function LeaveTypesPage() {
  const [data, setData] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData((await listLeaveTypes({ page: 1, limit: 100 })).data)
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
        breadcrumbs={[{ label: 'Types de congé' }]}
        action={<AddPageLink href="/leave-types/new" label="Ajouter" />}
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
        entityLabel="types de congé"
        tableId="hs-leave-types-table"
        emptyMessage="Aucun type de congé trouvé."
        actions={(row) => (
          <ActionButtons
            viewHref={`/leave-types/${row.id}`}
            editHref={`/leave-types/${row.id}/edit`}
            onDelete={() => {
              void deleteLeaveType(row.id).then(load)
            }}
          />
        )}
      />
    </div>
  )
}
