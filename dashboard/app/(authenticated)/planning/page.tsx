'use client'

import { ApiErrorBanner, secondaryBtnClass } from '@/components/timegate/ui'
import WriteLink from '@/components/timegate/WriteLink'
import { SelectSearch } from '@/components/ui/FormField'
import { NumberInput } from '@/components/ui/NumberInput'
import PageHeader from '@/components/ui/PageHeader'
import type { SelectOption } from '@/components/ui/select-search-types'
import { HttpError } from '@/lib/http'
import { findOption, toSelectOptions } from '@/lib/select-options'
import { listBranches } from '@/lib/timegate/branches'
import { getPlanningCalendar, type PlanningCalendarDay } from '@/lib/timegate/planning'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

function monthBounds(year: number, month: number) {
  const from = new Date(Date.UTC(year, month - 1, 1)).toISOString().slice(0, 10)
  const to = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10)
  return { from, to }
}

function weekdayLabels() {
  return ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
}

export default function PlanningPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getUTCFullYear())
  const [month, setMonth] = useState(now.getUTCMonth() + 1)
  const [branchId, setBranchId] = useState('')
  const [days, setDays] = useState<PlanningCalendarDay[]>([])
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const bounds = useMemo(() => monthBounds(year, month), [year, month])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getPlanningCalendar({
        from: bounds.from,
        to: bounds.to,
        ...(branchId ? { branchId } : {}),
      })
      setDays(res.days)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [bounds.from, bounds.to, branchId])

  useEffect(() => {
    void listBranches({ limit: 100 })
      .then((res) => setBranchOptions(toSelectOptions(res.data)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const gridStart = useMemo(() => {
    const first = new Date(`${bounds.from}T00:00:00.000Z`)
    const dow = first.getUTCDay()
    const offset = dow === 0 ? 6 : dow - 1
    const start = new Date(first)
    start.setUTCDate(start.getUTCDate() - offset)
    return start
  }, [bounds.from])

  const cells = useMemo(() => {
    const byDate = new Map(days.map((d) => [d.date, d]))
    return Array.from({ length: 42 }, (_, i) => {
      const date = new Date(gridStart)
      date.setUTCDate(date.getUTCDate() + i)
      const iso = date.toISOString().slice(0, 10)
      return { iso, inMonth: iso >= bounds.from && iso <= bounds.to, day: byDate.get(iso) }
    })
  }, [days, gridStart, bounds.from, bounds.to])

  const monthAssignments = useMemo(() => {
    const seen = new Set<string>()
    const rows: PlanningCalendarDay['assignments'] = []
    for (const day of days) {
      for (const row of day.assignments) {
        if (seen.has(row.id)) continue
        seen.add(row.id)
        rows.push(row)
      }
    }
    return rows.sort((a, b) =>
      `${a.employee.lastName}${a.employee.firstName}`.localeCompare(
        `${b.employee.lastName}${b.employee.firstName}`,
      ),
    )
  }, [days])

  const holidayCount = useMemo(() => {
    const seen = new Set<string>()
    for (const day of days) {
      for (const h of day.holidays) seen.add(h.id)
    }
    return seen.size
  }, [days])

  const monthLabel = useMemo(() => {
    const d = new Date(Date.UTC(year, month - 1, 1))
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
  }, [year, month])

  return (
    <div className="space-y-4" data-tour="planning">
      <PageHeader
        breadcrumbs={[{ label: 'Planning prévu' }]}
        action={
          <Link href="/manager/leaves" className={secondaryBtnClass}>
            <i className="fa-solid fa-umbrella-beach" />
            Absences équipe
          </Link>
        }
      />

      <ApiErrorBanner message={error} />

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-surface-card shadow-sm dark:border-border-dark dark:bg-surface-card-dark">
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-200/80 px-4 py-3 dark:border-border-dark">
          <div className="w-28">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Année
            </label>
            <NumberInput
              variant="toolbar"
              min={2000}
              max={2100}
              step={1}
              value={year}
              onChange={(value) => setYear(value)}
            />
          </div>

          <div className="w-28">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Mois
            </label>
            <NumberInput
              variant="toolbar"
              min={1}
              max={12}
              step={1}
              value={month}
              onChange={(value) => setMonth(value)}
            />
          </div>

          <div className="min-w-48 flex-1 sm:max-w-xs">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Branche
            </label>
            <SelectSearch
              instanceId="planning-branch"
              variant="toolbar"
              options={branchOptions}
              value={findOption(branchOptions, branchId)}
              onChange={(opt) => setBranchId(opt?.value ?? '')}
              placeholder="Toutes"
              isClearable={Boolean(branchId)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 px-4 py-2.5 dark:border-border-dark">
          <p className="text-sm capitalize text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">{monthLabel}</span>
            <span className="text-slate-400"> · </span>
            {monthAssignments.length} affectation{monthAssignments.length === 1 ? '' : 's'}
            {holidayCount > 0 ? (
              <>
                <span className="text-slate-400"> · </span>
                {holidayCount} férié{holidayCount === 1 ? '' : 's'}
              </>
            ) : null}
            {loading ? <span className="text-slate-400"> · Chargement…</span> : null}
          </p>
          <div className="flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded bg-sky-200 dark:bg-sky-800/80" /> Affectation
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-3 rounded bg-emerald-200 dark:bg-emerald-800/80" /> Férié
            </span>
          </div>
        </div>

        <div className="border-b border-slate-200/80 p-4 dark:border-border-dark">
          <div className="grid grid-cols-7 gap-2">
            {weekdayLabels().map((label) => (
              <div
                key={label}
                className="py-1 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
              >
                {label}
              </div>
            ))}
            {cells.map(({ iso, inMonth, day }) => (
              <div
                key={iso}
                className={`min-h-28 rounded-lg border p-2 text-xs ${
                  inMonth
                    ? 'border-slate-200/80 bg-surface dark:border-border-dark dark:bg-surface-elevated-dark/40'
                    : 'border-transparent bg-surface/50 text-slate-400 dark:bg-surface-dark/40 dark:text-slate-600'
                }`}
              >
                <div
                  className={`mb-1 font-semibold ${
                    inMonth
                      ? 'text-slate-800 dark:text-slate-100'
                      : 'text-slate-400 dark:text-slate-600'
                  }`}
                >
                  {iso.slice(8)}
                </div>

                {day?.holidays.map((holiday) => (
                  <span
                    key={holiday.id}
                    className="mb-0.5 block truncate rounded bg-emerald-100 px-1 py-0.5 text-[10px] text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                    title={holiday.name}
                  >
                    {holiday.name}
                  </span>
                ))}

                {day?.assignments.map((row) => (
                  <WriteLink
                    key={row.id}
                    href={`/shift-assignments/${row.id}`}
                    className="mb-0.5 block truncate rounded bg-sky-100 px-1 py-0.5 text-[10px] text-sky-800 hover:opacity-80 dark:bg-sky-900/40 dark:text-sky-300"
                    title={`${row.employee.firstName} ${row.employee.lastName} — ${row.shiftType.name}`}
                  >
                    {row.employee.firstName} {row.employee.lastName?.[0]}.
                    {row.exception?.startTime && row.exception?.endTime
                      ? ` (${row.exception.startTime}–${row.exception.endTime})`
                      : ''}
                  </WriteLink>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="border-b border-slate-200/80 px-4 py-3 dark:border-border-dark">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Affectations du mois ({monthAssignments.length})
            </h3>
          </div>
          <div className="p-4">
            {monthAssignments.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aucune affectation sur cette période.
              </p>
            ) : (
              <ul className="space-y-2">
                {monthAssignments.map((row) => (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-sm last:border-0 dark:border-border-dark"
                  >
                    <div>
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {row.employee.firstName} {row.employee.lastName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {row.shiftType.name}
                        {row.shiftLocation ? ` · ${row.shiftLocation.name}` : ''}
                        {row.startDate || row.endDate
                          ? ` · ${row.startDate ?? '…'} → ${row.endDate ?? '…'}`
                          : ''}
                      </p>
                    </div>
                    <WriteLink
                      href={`/shift-assignments/${row.id}`}
                      className="text-xs font-medium text-primary hover:underline dark:text-accent"
                    >
                      Voir
                    </WriteLink>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
