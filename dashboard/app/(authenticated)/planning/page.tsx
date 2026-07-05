'use client'

import { FormField, Input } from '@/components/ui/FormField'
import PageHeader from '@/components/ui/PageHeader'
import { HttpError } from '@/lib/http'
import { listBranches } from '@/lib/timegate/branches'
import { getPlanningCalendar, type PlanningCalendarDay } from '@/lib/timegate/planning'
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
  const [view, setView] = useState<'planning' | 'leaves'>('planning')
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
    void listBranches({ page: 1, limit: 100 })
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

  return (
    <div className="space-y-4">
      <PageHeader breadcrumbs={[{ label: 'Planning équipe' }]} />
      <p className="text-sm text-gray-500 dark:text-neutral-400 mb-2">
        Affectations horaires, congés approuvés et jours fériés.
      </p>

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
            className="py-3 px-4 block w-full border border-slate-200/80 rounded-lg text-sm focus:border-primary focus:ring-primary disabled:opacity-50 disabled:pointer-events-none dark:bg-surface-elevated-dark dark:border-border-dark dark:text-slate-200 dark:placeholder-slate-500 dark:focus:ring-neutral-600"
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
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setView('planning')}
            className={`rounded-lg p-3 text-sm font-medium ${view === 'planning' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-neutral-800'}`}
          >
            Planning
          </button>
          <button
            type="button"
            onClick={() => setView('leaves')}
            className={`rounded-lg p-3 text-sm font-medium ${view === 'leaves' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-neutral-800'}`}
          >
            Congés équipe
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-gray-500">Chargement…</p> : null}

      <div className="grid grid-cols-7 gap-2">
        {weekdayLabels().map((label) => (
          <div key={label} className="text-center text-xs font-semibold text-gray-500 py-1">
            {label}
          </div>
        ))}
        {cells.map(({ iso, inMonth, day }) => {
          const assignmentCount = day?.assignments.length ?? 0
          const leaveCount = day?.leaves.length ?? 0
          const holidayCount = day?.holidays.length ?? 0
          const showPlanning = view === 'planning'
          const showLeaves = view === 'leaves'
          return (
            <div
              key={iso}
              className={`min-h-24 rounded-lg border p-2 text-xs ${
                inMonth
                  ? 'tg-card'
                  : 'border-transparent bg-black/10 dark:bg-white/5'
              }`}
            >
              <div className="font-semibold mb-1">{iso.slice(8)}</div>
              {showPlanning && assignmentCount > 0 ? (
                <p className="text-blue-700 dark:text-blue-300">{assignmentCount} affectation(s)</p>
              ) : null}
              {showLeaves && leaveCount > 0 ? (
                <p className="text-amber-700 dark:text-amber-300">{leaveCount} congé(s)</p>
              ) : null}
              {holidayCount > 0 ? (
                <p className="text-emerald-700 dark:text-emerald-300">{holidayCount} férié(s)</p>
              ) : null}
              {showPlanning
                ? day?.assignments.slice(0, 2).map((row) => (
                    <p key={row.id} className="truncate text-[11px] text-gray-600 dark:text-neutral-400">
                      {row.employee.firstName} {row.employee.lastName}
                    </p>
                  ))
                : null}
              {showLeaves
                ? day?.leaves.slice(0, 2).map((row) => (
                    <p key={row.id} className="truncate text-[11px] text-gray-600 dark:text-neutral-400">
                      {row.employee.firstName} {row.employee.lastName}
                    </p>
                  ))
                : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
