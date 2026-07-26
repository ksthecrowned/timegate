'use client'

import { ApiErrorBanner, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import PageHeader from '@/components/ui/PageHeader'
import { SelectSearch } from '@/components/ui/SelectSearch'
import type { SelectOption } from '@/components/ui/select-search-types'
import { HttpError } from '@/lib/http'
import { findOption, toSelectOptions } from '@/lib/select-options'
import { listBranches } from '@/lib/timegate/branches'
import { employeeDisplayName } from '@/lib/timegate/employee-display'
import {
  bulkReviewAttendanceEvents,
  getManagerInbox,
  INBOX_TYPE_LABELS,
  type InboxItemType,
  type ManagerInboxItem,
} from '@/lib/timegate/manager'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'

const ALL_BRANCHES_OPTION: SelectOption = { value: '', label: 'Toutes les branches' }

type TabKey = InboxItemType | 'ALL'

const TABS: Array<{
  key: TabKey
  label: string
  countKey: keyof ManagerInboxCounts
  icon: string
}> = [
  { key: 'ALL', label: 'Tout', countKey: 'total', icon: 'fa-inbox' },
  { key: 'ATTENDANCE_EVENT', label: 'Pointages', countKey: 'attendanceEvents', icon: 'fa-fingerprint' },
  { key: 'TIMESHEET_DAY', label: 'Journées', countKey: 'timesheetDays', icon: 'fa-calendar-day' },
  { key: 'LEAVE', label: 'Congés', countKey: 'leaves', icon: 'fa-umbrella-beach' },
  { key: 'SHIFT_SWAP', label: 'Échanges', countKey: 'shiftSwaps', icon: 'fa-right-left' },
  { key: 'PUNCH_CLAIM', label: 'Réclamations', countKey: 'punchClaims', icon: 'fa-flag' },
]

type ManagerInboxCounts = {
  attendanceEvents: number
  timesheetDays: number
  leaves: number
  shiftSwaps: number
  punchClaims: number
  total: number
}

function formatInboxWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }
  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

function itemSender(item: ManagerInboxItem): string {
  if (item.employee) return employeeDisplayName(item.employee)
  return item.title
}

function itemInitials(item: ManagerInboxItem): string {
  if (item.employee) {
    const a = item.employee.firstName?.[0] ?? ''
    const b = item.employee.lastName?.[0] ?? ''
    const pair = `${a}${b}`.toUpperCase()
    if (pair) return pair
  }
  return item.title.slice(0, 2).toUpperCase() || '?'
}

function itemSnippet(item: ManagerInboxItem): string {
  const parts = [INBOX_TYPE_LABELS[item.type], item.subtitle || item.title].filter(Boolean)
  return parts.join(' · ')
}

export default function ManagerInboxPage() {
  const router = useRouter()
  const [branchId, setBranchId] = useState('')
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([ALL_BRANCHES_OPTION])
  const [items, setItems] = useState<ManagerInboxItem[]>([])
  const [counts, setCounts] = useState<Partial<ManagerInboxCounts>>({})
  const [tab, setTab] = useState<TabKey>('ALL')
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    void listBranches({ limit: 100 }).then((res) =>
      setBranchOptions([ALL_BRANCHES_OPTION, ...toSelectOptions(res.data)]),
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
    () => (tab === 'ALL' ? items : items.filter((i) => i.type === tab)),
    [items, tab],
  )

  const eventItems = filtered.filter((i) => i.type === 'ATTENDANCE_EVENT')
  const allEventsSelected =
    eventItems.length > 0 && eventItems.every((i) => selectedEvents.has(i.id))

  function toggleEvent(id: string) {
    setSelectedEvents((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllEvents() {
    if (allEventsSelected) setSelectedEvents(new Set())
    else setSelectedEvents(new Set(eventItems.map((i) => i.id)))
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
      setMessage(
        `${res.reviewed} pointage(s) accepté(s)${res.failed ? `, ${res.failed} échec(s)` : ''}.`,
      )
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Validation impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  const showBulkBar =
    (tab === 'ALL' || tab === 'ATTENDANCE_EVENT') && eventItems.length > 0

  return (
    <div data-tour="manager-inbox">
      <PageHeader
        breadcrumbs={[
          { label: 'Manager', href: '/' },
          { label: 'Boîte de réception' },
        ]}
        action={
          <Link href="/manager/team" className={secondaryBtnClass}>
            <i className="fa-solid fa-users" />
            Équipe du jour
          </Link>
        }
      />

      <ApiErrorBanner message={error} />
      {message ? (
        <p className="mb-4 text-sm text-emerald-700 dark:text-emerald-400">{message}</p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-surface-card shadow-sm dark:border-border-dark dark:bg-surface-card-dark">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 px-3 py-2 dark:border-border-dark">
          {showBulkBar ? (
            <>
              <label className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5">
                <input
                  type="checkbox"
                  checked={allEventsSelected}
                  onChange={toggleSelectAllEvents}
                  className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
                  title="Sélectionner les pointages visibles"
                />
                <span className="sr-only">Tout sélectionner</span>
              </label>
              <button
                type="button"
                disabled={submitting || selectedEvents.size === 0}
                onClick={() => void bulkAccept()}
                className={`${primaryBtnClass} !py-1.5 !px-3 text-xs`}
              >
                {submitting ? 'Validation…' : `Accepter (${selectedEvents.size})`}
              </button>
              <div className="mx-1 hidden h-5 w-px bg-slate-200 sm:block dark:bg-border-dark" />
            </>
          ) : null}

          <div className="min-w-[12rem] flex-1 sm:max-w-xs">
            <SelectSearch
              instanceId="inbox-branch"
              variant="toolbar"
              options={branchOptions}
              value={findOption(branchOptions, branchId) ?? ALL_BRANCHES_OPTION}
              onChange={(opt) => setBranchId(opt?.value ?? '')}
              placeholder="Toutes les branches"
              isClearable={Boolean(branchId)}
            />
          </div>

          <button
            type="button"
            onClick={() => void load()}
            className="ms-auto inline-flex size-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-slate-100"
            title="Actualiser"
          >
            <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="overflow-x-auto border-b border-slate-200/80 dark:border-border-dark">
          <nav className="flex min-w-max gap-0 px-1" role="tablist" aria-label="Types d’approbation">
            {TABS.map((t) => {
              const count = Number(counts[t.countKey] ?? 0)
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={`relative inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    active
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-slate-100'
                  }`}
                >
                  <i className={`fa-solid ${t.icon} text-xs opacity-70`} aria-hidden />
                  {t.label}
                  {count > 0 ? (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                        active
                          ? 'bg-primary/15 text-primary'
                          : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
                      }`}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </nav>
        </div>

        {/* List */}
        <div role="tabpanel" className="min-h-[28rem]">
          {loading ? (
            <div className="space-y-0 divide-y divide-slate-100 dark:divide-border-dark">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="size-4 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  <div className="size-9 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-2.5 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-[28rem] flex-col items-center justify-center gap-2 px-6 text-center">
              <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/10">
                <i className="fa-regular fa-envelope-open text-2xl" />
              </div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                Boîte vide
              </p>
              <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
                Aucune approbation en attente
                {tab !== 'ALL' ? ` pour « ${TABS.find((t) => t.key === tab)?.label} »` : ''}.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-border-dark">
              {filtered.map((item) => {
                const isEvent = item.type === 'ATTENDANCE_EVENT'
                const selected = selectedEvents.has(item.id)
                const initials = itemInitials(item)

                return (
                  <li key={`${item.type}-${item.id}`}>
                    <div
                      className={`group flex cursor-pointer items-stretch gap-2 px-2 transition-colors sm:px-3 ${
                        selected
                          ? 'bg-primary/10'
                          : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                      }`}
                      onClick={() => router.push(item.href)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          router.push(item.href)
                        }
                      }}
                      role="link"
                      tabIndex={0}
                    >
                      <div
                        className="flex items-center px-1"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        {isEvent ? (
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleEvent(item.id)}
                            className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
                            aria-label={`Sélectionner ${item.title}`}
                          />
                        ) : (
                          <span className="inline-block size-4" aria-hidden />
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 items-center gap-3 py-2.5">
                        <div
                          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
                          aria-hidden
                        >
                          {initials}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline gap-2">
                            <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                              {itemSender(item)}
                            </span>
                            <span className="hidden truncate text-sm text-slate-600 sm:inline dark:text-slate-300">
                              {item.title !== itemSender(item) ? item.title : null}
                            </span>
                          </div>
                          <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                            {itemSnippet(item)}
                          </p>
                        </div>

                        <time
                          dateTime={item.createdAt}
                          className="shrink-0 self-start pt-0.5 text-xs font-medium tabular-nums text-slate-500 group-hover:text-slate-700 dark:text-slate-400"
                        >
                          {formatInboxWhen(item.createdAt)}
                        </time>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
