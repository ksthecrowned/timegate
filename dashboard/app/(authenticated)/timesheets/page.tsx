'use client'

import { useSubscriptionAccess } from '@/components/providers/SubscriptionAccessProvider'
import { dateTableColumn } from '@/components/timegate/date-table-column'
import { employeeTableColumn } from '@/components/timegate/employee-table-column'
import { ApiErrorBanner, primaryBtnClass } from '@/components/timegate/ui'
import ActionButtons from '@/components/ui/ActionButtons'
import DataTable, { Column } from '@/components/ui/DataTable'
import { DateField, SelectSearch } from '@/components/ui/FormField'
import PageHeader from '@/components/ui/PageHeader'
import type { SelectOption } from '@/components/ui/select-search-types'
import StatusBadge from '@/components/ui/StatusBadge'
import { STATUS_OPTIONS } from '@/constants'
import { formatApiDate, parseApiDate } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'
import { findOption, toSelectOptions } from '@/lib/select-options'
import { listBranches } from '@/lib/timegate/branches'
import { lastNDaysRange } from '@/lib/timegate/period-range'
import {
  formatMinutes,
  listTimesheets,
  recalculateTimesheets,
} from '@/lib/timegate/timesheets'
import type { TimesheetDay } from '@/lib/timegate/types'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

const defaultRange = lastNDaysRange(30)

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
    render: (_, row) => (
      <StatusBadge status={findOption(STATUS_OPTIONS, row.status)?.label ?? row.status} />
    ),
  },
]

function formatPeriodLabel(from: string, to: string) {
  const a = formatApiDate(from)
  const b = formatApiDate(to)
  return from === to ? a : `${a} → ${b}`
}

export default function TimesheetsPage() {
  const { canWrite } = useSubscriptionAccess()
  const [from, setFrom] = useState(defaultRange.from)
  const [to, setTo] = useState(defaultRange.to)
  const [branchId, setBranchId] = useState('')
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([])
  const [data, setData] = useState<TimesheetDay[]>([])
  const [loading, setLoading] = useState(true)
  const [recalculating, setRecalculating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const queryParams = useMemo(
    () => ({
      page: 1,
      limit: 100,
      from,
      to,
      ...(branchId ? { branchId } : {}),
    }),
    [from, to, branchId],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData((await listTimesheets(queryParams)).data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [queryParams])

  useEffect(() => {
    void listBranches({ limit: 100 })
      .then((res) => setBranchOptions(toSelectOptions(res.data)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleRecalculate() {
    if (!canWrite) return
    setRecalculating(true)
    setError('')
    setSuccess('')
    try {
      const res = await recalculateTimesheets({
        from,
        to,
        ...(branchId ? { branchId } : {}),
      })
      setSuccess(
        `Recalcul terminé : ${res.created} créé(s), ${res.updated} mis à jour (${res.days} jours).`,
      )
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Recalcul impossible.')
    } finally {
      setRecalculating(false)
    }
  }

  return (
    <div className="space-y-4" data-tour="timesheets">
      <PageHeader
        breadcrumbs={[{ label: 'Présence' }, { label: 'Temps travaillé' }]}
        action={
          <button
            type="button"
            disabled={recalculating || !canWrite}
            title={!canWrite ? 'Lecture seule — activez une clé' : undefined}
            onClick={() => void handleRecalculate()}
            className={primaryBtnClass}
          >
            <i className="fa-solid fa-rotate" />
            {recalculating ? 'Recalcul…' : 'Recalculer'}
          </button>
        }
      />

      <ApiErrorBanner message={error} />
      {success ? (
        <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-700 dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-400">
          {success}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-surface-card shadow-sm dark:border-border-dark dark:bg-surface-card-dark">
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-200/80 px-4 py-3 dark:border-border-dark">
          <div className="min-w-40">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Du
            </label>
            <DateField variant="toolbar" value={from} onChange={setFrom} />
          </div>
          <div className="min-w-40">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Au
            </label>
            <DateField
              variant="toolbar"
              value={to}
              onChange={setTo}
              minDate={parseApiDate(from) ?? undefined}
            />
          </div>
          <div className="min-w-48 flex-1 sm:max-w-xs">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Branche
            </label>
            <SelectSearch
              instanceId="timesheets-branch"
              variant="toolbar"
              options={branchOptions}
              value={findOption(branchOptions, branchId)}
              onChange={(opt) => setBranchId(opt?.value ?? '')}
              placeholder="Toutes"
              isClearable={Boolean(branchId)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">
              {formatPeriodLabel(from, to)}
            </span>
            <span className="text-slate-400"> · </span>
            {data.length} feuille{data.length === 1 ? '' : 's'}
            {loading ? <span className="text-slate-400"> · Chargement…</span> : null}
          </p>
          <Link href="/attendance/days" className="text-sm text-primary hover:underline">
            Voir le registre de présence
          </Link>
        </div>
      </div>

      <DataTable
        loading={loading}
        data={data}
        columns={columns}
        entityLabel="feuilles de temps"
        tableId="hs-timesheets-table"
        emptyMessage="Aucune feuille de temps trouvée."
        actions={(row) => <ActionButtons viewHref={`/timesheets/${row.id}`} />}
      />
    </div>
  )
}
