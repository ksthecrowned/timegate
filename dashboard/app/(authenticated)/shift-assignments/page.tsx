'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import ActionButtons from '@/components/ui/ActionButtons'
import AddPageLink from '@/components/timegate/AddPageLink'
import { employeeTableColumn } from '@/components/timegate/employee-table-column'
import { dateTableColumn } from '@/components/timegate/date-table-column'
import { deleteShiftAssignment, listShiftAssignments } from '@/lib/timegate/shift-assignments'
import type { ShiftAssignment } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

const columns: Column<ShiftAssignment>[] = [
  employeeTableColumn<ShiftAssignment>({ sortable: true }),
  {
    key: 'shiftType',
    label: 'Horaire',
    render: (_, row) => row.shiftType?.name ?? '—',
  },
  {
    key: 'shiftLocation',
    label: 'Lieu',
    render: (_, row) => row.shiftLocation?.name ?? '—',
  },
  dateTableColumn<ShiftAssignment>('startDate', 'Date début'),
  dateTableColumn<ShiftAssignment>('endDate', 'Date fin'),
]

export default function ShiftAssignmentsPage() {
  const [data, setData] = useState<ShiftAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData((await listShiftAssignments({ page: 1, limit: 100 })).data)
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
        breadcrumbs={[{ label: 'Affectations horaires' }]}
        action={
          <AddPageLink href="/shift-assignments/new" label="Ajouter une affectation" />
        }
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
          entityLabel="affectations"
          tableId="hs-shift-assignments-table"
          emptyMessage="Aucune affectation trouvée."
          actions={(row) => (
            <ActionButtons
              viewHref={`/shift-assignments/${row.id}`}
              editHref={`/shift-assignments/${row.id}/edit`}
              onDelete={() => {
                void deleteShiftAssignment(row.id).then(load)
              }}
            />
          )}
        />
    </div>
  )
}
