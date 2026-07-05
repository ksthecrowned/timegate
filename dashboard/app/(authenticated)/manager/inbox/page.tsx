'use client'

import { ApiErrorBanner, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import PageHeader from '@/components/ui/PageHeader'
import { HttpError } from '@/lib/http'
import { listBranches } from '@/lib/timegate/branches'
import {
  bulkReviewAttendanceEvents,
  getManagerInbox,
  INBOX_TYPE_LABELS,
  type InboxItemType,
  type ManagerInboxItem,
} from '@/lib/timegate/manager'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

const TYPE_FILTERS: Array<{ key: InboxItemType | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'Tout' },
  { key: 'ATTENDANCE_EVENT', label: 'Pointages' },
  { key: 'TIMESHEET_DAY', label: 'Journées' },
  { key: 'LEAVE', label: 'Congés' },
  { key: 'SHIFT_SWAP', label: 'Échanges' },
  { key: 'PUNCH_CLAIM', label: 'Réclamations' },
]

export default function ManagerInboxPage() {
  const [branchId, setBranchId] = useState('')
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([])
  const [items, setItems] = useState<ManagerInboxItem[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [typeFilter, setTypeFilter] = useState<InboxItemType | 'ALL'>('ALL')
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    void listBranches({ limit: 100 }).then((res) =>
      setBranches(res.data.map((b) => ({ id: b.id, name: b.name }))),
    )
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const res = await getManagerInbox({
        limit: 100,
        ...(branchId ? { branchId } : {}),
      })
      setItems(res.items)
      setCounts(res.counts)
      setSelectedEvents(new Set())
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [branchId])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(
    () => (typeFilter === 'ALL' ? items : items.filter((i) => i.type === typeFilter)),
    [items, typeFilter],
  )

  const eventItems = filtered.filter((i) => i.type === 'ATTENDANCE_EVENT')

  function toggleEvent(id: string) {
    setSelectedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllEvents() {
    setSelectedEvents(new Set(eventItems.map((i) => i.id)))
  }

  async function bulkAccept() {
    if (selectedEvents.size === 0) return
    setSubmitting(true)
    setError('')
    setMessage('')
    try {
      const res = await bulkReviewAttendanceEvents({
        eventIds: [...selectedEvents],
        status: 'ACCEPTED',
      })
      setMessage(`${res.reviewed} pointage(s) accepté(s)${res.failed ? `, ${res.failed} échec(s)` : ''}.`)
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Validation impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Manager', href: '/' },
          { label: 'Boîte de réception' }
        ]}
        // title="Boîte de réception"
        // subtitle="Pointages à valider, check-out oubliés, congés et échanges de shift."
        action={
          <Link href="/manager/team" className={secondaryBtnClass}>
            Équipe du jour
          </Link>
        }
      />

      <ApiErrorBanner message={error} />
      {message && (
        <p className="mb-4 text-sm text-emerald-700 dark:text-emerald-400">{message}</p>
      )}

      <div className="mb-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="tg-card shadow-2xs p-3">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl font-semibold">{counts.total ?? 0}</p>
        </div>
        <div className="tg-card shadow-2xs p-3">
          <p className="text-xs text-gray-500">Pointages</p>
          <p className="text-xl font-semibold">{counts.attendanceEvents ?? 0}</p>
        </div>
        <div className="tg-card shadow-2xs p-3">
          <p className="text-xs text-gray-500">Journées</p>
          <p className="text-xl font-semibold">{counts.timesheetDays ?? 0}</p>
        </div>
        <div className="tg-card shadow-2xs p-3">
          <p className="text-xs text-gray-500">Congés</p>
          <p className="text-xl font-semibold">{counts.leaves ?? 0}</p>
        </div>
        <div className="tg-card shadow-2xs p-3">
          <p className="text-xs text-gray-500">Échanges</p>
          <p className="text-xl font-semibold">{counts.shiftSwaps ?? 0}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          <span className="block text-gray-500 mb-1">Branche</span>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="py-3 px-4 block w-full border border-slate-200/80 rounded-lg text-sm focus:border-primary focus:ring-primary disabled:opacity-50 disabled:pointer-events-none dark:bg-surface-elevated-dark dark:border-border-dark dark:text-slate-200 dark:placeholder-slate-500 dark:focus:ring-neutral-600 cursor-pointer"
          >
            <option value="">Toutes</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setTypeFilter(f.key)}
              className={`rounded-full py-2 px-8 text-sm font-medium border ${
                typeFilter === f.key
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-200 text-gray-600 dark:border-border-dark'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {(typeFilter === 'ALL' || typeFilter === 'ATTENDANCE_EVENT') && eventItems.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          <button type="button" onClick={selectAllEvents} className={secondaryBtnClass}>
            Tout sélectionner (pointages)
          </button>
          <button
            type="button"
            disabled={submitting || selectedEvents.size === 0}
            onClick={() => void bulkAccept()}
            className={primaryBtnClass}
          >
            {submitting ? 'Validation…' : `Accepter (${selectedEvents.size})`}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500">Aucune approbation en attente.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((item) => (
            <li
              key={`${item.type}-${item.id}`}
              className="tg-card shadow-2xs px-4 py-3 flex flex-wrap items-center gap-3"
            >
              {item.type === 'ATTENDANCE_EVENT' && (
                <input
                  type="checkbox"
                  checked={selectedEvents.has(item.id)}
                  onChange={() => toggleEvent(item.id)}
                  className="rounded border-gray-300"
                />
              )}
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    {INBOX_TYPE_LABELS[item.type]}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">{item.title}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-neutral-400">{item.subtitle}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(item.createdAt).toLocaleString('fr-FR')}
                </p>
              </div>
              <Link href={item.href} className={secondaryBtnClass}>
                Traiter
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
