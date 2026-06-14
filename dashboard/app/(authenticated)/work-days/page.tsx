'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import ActionButtons from '@/components/ui/ActionButtons'
import AddPageLink from '@/components/timegate/AddPageLink'
import { deleteWorkDay, listWorkDays, WEEK_DAY_LABELS } from '@/lib/timegate/work-days'
import type { WorkDay } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

function formatTime(value: string): string {
  if (value.includes('T')) return value.slice(11, 16)
  return value.slice(0, 5)
}

const columns: Column<WorkDay>[] = [
  {
    key: 'shiftType',
    label: 'Horaire',
    sortable: true,
    render: (_, row) => row.shiftType?.name ?? '—',
  },
  {
    key: 'day',
    label: 'Jour',
    render: (_, row) => WEEK_DAY_LABELS[row.day] ?? row.day,
  },
  {
    key: 'startTime',
    label: 'Horaires',
    render: (_, row) => `${formatTime(row.startTime)} — ${formatTime(row.endTime)}`,
  },
]

export default function WorkDaysPage() {
  const searchParams = useSearchParams()
  const scheduleId = searchParams.get('scheduleId') ?? undefined
  const [data, setData] = useState<WorkDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData((await listWorkDays({ page: 1, limit: 100, scheduleId })).data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [scheduleId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Jours ouvrés' }]}
        action={<AddPageLink href="/work-days/new" label="Ajouter un jour ouvré" />}
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
          entityLabel="jours ouvrés"
          tableId="hs-work-days-table"
          emptyMessage="Aucun jour ouvré trouvé."
          actions={(row) => (
            <ActionButtons
              viewHref={`/work-days/${row.id}`}
              editHref={`/work-days/${row.id}/edit`}
              onDelete={() => {
                void deleteWorkDay(row.id).then(load)
              }}
            />
          )}
        />
    </div>
  )
}
