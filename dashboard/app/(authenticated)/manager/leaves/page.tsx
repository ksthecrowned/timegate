'use client'

import { ApiErrorBanner, secondaryBtnClass } from '@/components/timegate/ui'
import { FormField, Input } from '@/components/ui/FormField'
import PageHeader from '@/components/ui/PageHeader'
import { HttpError } from '@/lib/http'
import { listBranches } from '@/lib/timegate/branches'
import { getPlanningCalendar, type PlanningCalendarDay } from '@/lib/timegate/planning'
import Link from 'next/link'
import WriteLink from '@/components/timegate/WriteLink'
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
  if (status === 'APPROVED') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
  return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
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
    <div className="space-y-4">
      <PageHeader
        breadcrumbs={[{ label: 'Manager', href: '/' }, { label: 'Calendrier congés' }]}
        // title="Calendrier congés équipe"
        // subtitle="Congés approuvés et demandes en attente — vue mensuelle."
        action={
          <Link href="/manager/inbox" className={secondaryBtnClass}>
            Boîte de réception
          </Link>
        }
      />

      <ApiErrorBanner message={error} />

      <div className="flex flex-wrap gap-3 items-end">
        <div className="w-28">
          <FormField label="Année">
            <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </FormField>
        </div>
        <div className="w-28">
          <FormField label="Mois">
            <Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} />
          </FormField>
        </div>
        <div className="min-w-[220px]">
          <FormField label="Branche">
            <select
              className="py-3 px-4 block w-full border border-slate-200/80 rounded-lg text-sm focus:border-primary focus:ring-primary disabled:opacity-50 disabled:pointer-events-none dark:bg-white/10 dark:border-border-dark dark:text-slate-200 dark:placeholder-slate-500 dark:focus:ring-neutral-600  "
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

      <div className="flex flex-wrap gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-200" /> Approuvé
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-200" /> En attente
        </span>
      </div>

      {loading ? <p className="text-sm text-gray-500">Chargement…</p> : null}

      <div className="grid grid-cols-7 gap-2">
        {weekdayLabels().map((label) => (
          <div key={label} className="text-center text-xs font-semibold text-gray-500 py-1">
            {label}
          </div>
        ))}
        {cells.map(({ iso, inMonth, day }) => (
          <div
            key={iso}
            className={`min-h-28 rounded-lg border p-2 text-xs ${
              inMonth
                ? 'border-gray-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
                : 'border-transparent bg-gray-50 text-gray-400 dark:bg-neutral-950'
            }`}
          >
            <div className="font-semibold mb-1">{iso.slice(8)}</div>
            {day?.leaves.map((leave) => (
              <WriteLink
                key={`${iso}-${leave.id}`}
                href={`/leaves/${leave.id}/edit`}
                className={`block truncate rounded px-1 py-0.5 mb-0.5 text-[10px] hover:opacity-80 ${leaveStatusClass(leave.status)}`}
                title={`${leave.employee.firstName} ${leave.employee.lastName} — ${leave.leaveType}`}
              >
                {leave.employee.firstName} {leave.employee.lastName?.[0]}.
              </WriteLink>
            ))}
          </div>
        ))}
      </div>

      <div className="tg-card shadow-2xs p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Congés du mois ({monthLeaves.length})
        </h3>
        {monthLeaves.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun congé sur cette période.</p>
        ) : (
          <ul className="space-y-2">
            {monthLeaves.map((leave) => (
              <li
                key={leave.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm border-b border-gray-100 dark:border-neutral-800 pb-2 last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {leave.employee.firstName} {leave.employee.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {leave.leaveType} · {leave.fromDate} → {leave.toDate}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${leaveStatusClass(leave.status)}`}>
                    {leaveStatusLabel(leave.status)}
                  </span>
                  <WriteLink href={`/leaves/${leave.id}/edit`} className="text-xs text-primary hover:underline">
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
