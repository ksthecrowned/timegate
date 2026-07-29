'use client'

import { ApiErrorBanner, secondaryBtnClass } from '@/components/timegate/ui'
import WriteLink from '@/components/timegate/WriteLink'
import { FormField, Input } from '@/components/ui/FormField'
import PageHeader from '@/components/ui/PageHeader'
import { HttpError } from '@/lib/http'
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

function leaveStatusClass(status: string) {
  if (status === 'APPROVED') {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
  }
  return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
}

function leaveStatusLabel(status: string) {
  return status === 'APPROVED' ? 'Approuvé' : 'En attente'
}

export default function ManagerLeavesCalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getUTCFullYear())
  const [month, setMonth] = useState(now.getUTCMonth() + 1)
  const [branchId, setBranchId] = useState('')
  const [days, setDays] = useState<PlanningCalendarDay[]>([])
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([])
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
      .then((res) => setBranches(res.data.map((b) => ({ id: b.id, name: b.name }))))
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

  const monthLeaves = useMemo(() => {
    const seen = new Set<string>()
    const rows: PlanningCalendarDay['leaves'] = []
    for (const day of days) {
      for (const leave of day.leaves) {
        if (seen.has(leave.id)) continue
        seen.add(leave.id)
        rows.push(leave)
      }
    }
    return rows.sort((a, b) => (a.fromDate ?? '').localeCompare(b.fromDate ?? ''))
  }, [days])

  return (
    <div className="space-y-4" data-tour="manager-leaves">
      <PageHeader
        breadcrumbs={[{ label: 'Manager', href: '/' }, { label: 'Absences équipe' }]}
        action={
          <Link href="/manager/inbox" className={secondaryBtnClass}>
            Boite de réception
          </Link>
        }
      />

      <ApiErrorBanner message={error} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-28">
          <FormField label="Année">
            <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </FormField>
        </div>
        <div className="w-28">
          <FormField label="Mois">
            <Input
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            />
          </FormField>
        </div>
        <div className="min-w-[220px]">
          <FormField label="Branche">
            <select
              className="block w-full rounded-lg border border-slate-200/80 bg-surface px-4 py-3 text-sm text-slate-800 focus:border-primary focus:ring-primary disabled:pointer-events-none disabled:opacity-50 dark:border-border-dark dark:bg-surface-dark dark:text-slate-200"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">Toutes</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-emerald-200 dark:bg-emerald-800/80" /> Approuvé
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-amber-200 dark:bg-amber-800/80" /> En attente
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Chargement…</p>
      ) : null}

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
                ? 'border-slate-200/80 bg-surface-card dark:border-border-dark dark:bg-surface-card-dark'
                : 'border-transparent bg-surface text-slate-400 dark:bg-surface-dark dark:text-slate-600'
            }`}
          >
            <div
              className={`mb-1 font-semibold ${
                inMonth ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-600'
              }`}
            >
              {iso.slice(8)}
            </div>
            {day?.leaves.map((leave) => (
              <WriteLink
                key={`${iso}-${leave.id}`}
                href={`/leaves/${leave.id}/edit`}
                className={`mb-0.5 block truncate rounded px-1 py-0.5 text-[10px] hover:opacity-80 ${leaveStatusClass(leave.status)}`}
                title={`${leave.employee.firstName} ${leave.employee.lastName} — ${leave.leaveType}`}
              >
                {leave.employee.firstName} {leave.employee.lastName?.[0]}.
              </WriteLink>
            ))}
          </div>
        ))}
      </div>

      <div className="tg-card p-4 shadow-2xs">
        <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
          Congés du mois ({monthLeaves.length})
        </h3>
        {monthLeaves.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Aucun congé sur cette période.</p>
        ) : (
          <ul className="space-y-2">
            {monthLeaves.map((leave) => (
              <li
                key={leave.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 text-sm last:border-0 dark:border-border-dark"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {leave.employee.firstName} {leave.employee.lastName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {leave.leaveType} · {leave.fromDate} → {leave.toDate}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${leaveStatusClass(leave.status)}`}
                  >
                    {leaveStatusLabel(leave.status)}
                  </span>
                  <WriteLink
                    href={`/leaves/${leave.id}/edit`}
                    className="text-xs font-medium text-primary hover:underline dark:text-accent"
                  >
                    Voir
                  </WriteLink>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
