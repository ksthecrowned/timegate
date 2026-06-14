'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import ActionButtons from '@/components/ui/ActionButtons'
import AddPageLink from '@/components/timegate/AddPageLink'
import { deleteShiftType, listShiftTypes } from '@/lib/timegate/shift-types'
import type { ShiftType } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

function formatTime(value: string): string {
  if (value.includes('T')) return value.slice(11, 16)
  return value.slice(0, 5)
}

const columns: Column<ShiftType>[] = [
  { key: 'name', label: 'Nom', sortable: true },
  {
    key: 'branch',
    label: 'Branche',
    render: (_, row) => row.branch?.name ?? '—',
  },
  {
    key: 'startTime',
    label: 'Horaires',
    render: (_, row) => `${formatTime(row.startTime)} — ${formatTime(row.endTime)}`,
  },
  {
    key: 'lateGraceMinutes',
    label: 'Tolérance (min)',
    render: (v) => (v != null ? String(v) : '—'),
  },
]

export default function ShiftTypesPage() {
  const [data, setData] = useState<ShiftType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData((await listShiftTypes({ page: 1, limit: 100 })).data)
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
        breadcrumbs={[{ label: 'Horaires' }]}
        action={<AddPageLink href="/shift-types/new" label="Ajouter un horaire" />}
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
          entityLabel="horaires"
          tableId="hs-shift-types-table"
          emptyMessage="Aucun horaire trouvé."
          actions={(row) => (
            <ActionButtons
              viewHref={`/shift-types/${row.id}`}
              editHref={`/shift-types/${row.id}/edit`}
              onDelete={() => {
                void deleteShiftType(row.id).then(load)
              }}
            />
          )}
        />
    </div>
  )
}
