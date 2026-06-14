'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import ActionButtons from '@/components/ui/ActionButtons'
import PeriodRecalculateButton from '@/components/timegate/PeriodRecalculateButton'
import { employeeTableColumn } from '@/components/timegate/employee-table-column'
import { dateTableColumn } from '@/components/timegate/date-table-column'
import { formatMinutes, listTimesheets, recalculateTimesheets } from '@/lib/timegate/timesheets'
import type { TimesheetDay } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

const columns: Column<TimesheetDay>[] = [
  employeeTableColumn<TimesheetDay>({ sortable: true }),
  dateTableColumn<TimesheetDay>('date', 'Date', { sortable: true }),
  {
    key: 'workedMinutes',
    label: 'Travaillé',
    render: (_, row) => formatMinutes(row.workedMinutes),
  },
  {
    key: 'breakMinutes',
    label: 'Pause',
    render: (_, row) => formatMinutes(row.breakMinutes),
  },
  {
    key: 'lateMinutes',
    label: 'Retard',
    render: (_, row) => formatMinutes(row.lateMinutes),
  },
  {
    key: 'overtimeMinutes',
    label: 'Heures sup.',
    render: (_, row) => formatMinutes(row.overtimeMinutes),
  },
  {
    key: 'status',
    label: 'Statut',
    render: (_, row) => <StatusBadge status={row.status.toLowerCase()} />,
  },
]

export default function TimesheetsPage() {
  const [data, setData] = useState<TimesheetDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData((await listTimesheets({ page: 1, limit: 100 })).data)
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
      <PageHeader breadcrumbs={[{ label: 'Feuilles de temps' }]} />

      <PeriodRecalculateButton
        label="Recalculer les feuilles de temps"
        onRecalculate={async (range) => {
          const res = await recalculateTimesheets(range)
          await load()
          return {
            message: `Recalcul terminé : ${res.created} créé(s), ${res.updated} mis à jour (${res.days} jours).`,
          }
        }}
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
          entityLabel="feuilles de temps"
          tableId="hs-timesheets-table"
          emptyMessage="Aucune feuille de temps trouvée."
          actions={(row) => (
            <ActionButtons viewHref={`/timesheets/${row.id}`} />
          )}
        />
    </div>
  )
}
