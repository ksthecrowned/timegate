'use client'

import { useCallback, useEffect, useState } from 'react'
import ActionButtons from '@/components/ui/ActionButtons'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import { FormField, DateField } from '@/components/ui/FormField'
import { employeeTableColumn } from '@/components/timegate/employee-table-column'
import { dateTableColumn } from '@/components/timegate/date-table-column'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import {
  exportAttendanceDays,
  recalculateAttendanceDays,
  listAttendanceDays,
} from '@/lib/timegate/attendance'
import { lastNDaysRange } from '@/lib/timegate/period-range'
import type { AttendanceDay } from '@/lib/timegate/types'
import { parseApiDate } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'

const defaultRange = lastNDaysRange(30)

const columns: Column<AttendanceDay>[] = [
  employeeTableColumn<AttendanceDay>({
    getFallbackName: (row) => row.employeeName,
  }),
  dateTableColumn<AttendanceDay>('date', 'Date', { sortable: true }),
  {
    key: 'status',
    label: 'Statut',
    filterable: true,
    filterPlaceholder: 'statut',
    render: (v) => <StatusBadge status={String(v).toLowerCase()} />,
  },
  {
    key: 'shift',
    label: 'Horaire',
    render: (_, row) => row.shift?.name ?? '—',
  },
  {
    key: 'leaveType',
    label: 'Type congé',
    render: (_, row) => row.leaveType?.leaveTypeName ?? '—',
  },
]

export default function AttendanceDaysPage() {
  const [from, setFrom] = useState(defaultRange.from)
  const [to, setTo] = useState(defaultRange.to)
  const [data, setData] = useState<AttendanceDay[]>([])
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listAttendanceDays({ page: 1, limit: 100, from, to })
      setData(res.data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    void load()
  }, [load])

  async function handleRecalculate() {
    setRecalculating(true)
    setError('')
    setSuccess('')
    try {
      const res = await recalculateAttendanceDays({ from, to })
      setSuccess(`Recalcul terminé : ${res.created} créé(s), ${res.updated} mis à jour.`)
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Recalcul impossible.')
    } finally {
      setRecalculating(false)
    }
  }

  async function handleExport() {
    setExporting(true)
    setError('')
    try {
      const res = await exportAttendanceDays({ from, to, page: 1, limit: 100 })
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = res.filename
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Export impossible')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: 'Présence' }, { label: 'Jours' }]} />

      <FormCard title="Période">
        <div className="flex flex-wrap items-end gap-3">
          <FormField label="Du">
            <DateField value={from} onChange={setFrom} />
          </FormField>
          <FormField label="Au">
            <DateField value={to} onChange={setTo} minDate={parseApiDate(from) ?? undefined} />
          </FormField>
          <button type="button" onClick={() => void load()} className={secondaryBtnClass}>
            Actualiser
          </button>
          <button
            type="button"
            disabled={recalculating}
            onClick={() => void handleRecalculate()}
            className={primaryBtnClass}
          >
            {recalculating ? 'Recalcul…' : 'Recalculer les jours'}
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleExport()}
            className={secondaryBtnClass}
          >
            {exporting ? 'Export…' : 'Exporter CSV'}
          </button>
        </div>
        <ApiErrorBanner message={error} />
        {success && <p className="mt-3 text-sm text-primary dark:text-teal-300">{success}</p>}
      </FormCard>

      <DataTable
        loading={loading}
        data={data}
        columns={columns}
        entityLabel="jours"
        tableId="hs-attendance-days-table"
        emptyMessage="Aucun jour de présence."
        actions={(row) => <ActionButtons viewHref={`/attendance/days/${row.id}`} />}
      />
    </div>
  )
}
