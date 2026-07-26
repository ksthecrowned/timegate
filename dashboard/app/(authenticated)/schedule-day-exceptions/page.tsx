'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import ActionButtons from '@/components/ui/ActionButtons'
import AddPageLink from '@/components/timegate/AddPageLink'
import { dateTableColumn } from '@/components/timegate/date-table-column'
import {
  deleteScheduleDayException,
  listScheduleDayExceptions,
  type ScheduleDayException,
} from '@/lib/timegate/schedule-day-exceptions'
import { HttpError } from '@/lib/http'

const columns: Column<ScheduleDayException>[] = [
  {
    key: 'shiftType',
    label: 'Horaire',
    sortable: true,
    render: (_, row) => row.shiftType?.name ?? '—',
  },
  dateTableColumn<ScheduleDayException>('workDate', 'Date'),
  {
    key: 'isOff',
    label: 'Type',
    render: (_, row) => (row.isOff ? 'Non travaillé' : 'Horaires modifiés'),
  },
  {
    key: 'startTime',
    label: 'Horaires',
    render: (_, row) =>
      row.isOff ? '—' : `${row.startTime ?? '—'} – ${row.endTime ?? '—'}`,
  },
  {
    key: 'note',
    label: 'Note',
    render: (_, row) => row.note ?? '—',
  },
]

export default function ScheduleDayExceptionsPage() {
  const [data, setData] = useState<ScheduleDayException[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData((await listScheduleDayExceptions({ page: 1, limit: 100 })).data)
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
        breadcrumbs={[{ label: 'Exceptions de journée' }]}
        action={
          <AddPageLink href="/schedule-day-exceptions/new" label="Ajouter une exception" />
        }
      />
      <p className="mb-4 text-sm text-gray-500 dark:text-neutral-400">
        Par horaire type, pour une date précise : horaires différents (ex. 8h–12h) ou jour non
        travaillé. S’applique à tous les employés affectés à cet horaire.
      </p>
      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      ) : null}
      <DataTable
        loading={loading}
        data={data}
        columns={columns}
        entityLabel="exceptions"
        tableId="hs-schedule-day-exceptions-table"
        emptyMessage="Aucune exception."
        actions={(row) => (
          <ActionButtons
            editHref={`/schedule-day-exceptions/${row.id}/edit`}
            onDelete={() => {
              void deleteScheduleDayException(row.id).then(load)
            }}
          />
        )}
      />
    </div>
  )
}
