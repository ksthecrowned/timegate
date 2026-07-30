'use client'

import {
  TEAM_STATUS_STYLES,
  TeamSummaryCard,
} from '@/components/manager/TeamSummaryCard'
import { ApiErrorBanner, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import { DateField, SelectSearch } from '@/components/ui/FormField'
import IconMenuDropdown from '@/components/ui/IconMenuDropdown'
import PageHeader from '@/components/ui/PageHeader'
import type { SelectOption } from '@/components/ui/select-search-types'
import { HttpError } from '@/lib/http'
import { findOption, toSelectOptions } from '@/lib/select-options'
import { listBranches } from '@/lib/timegate/branches'
import {
  getManagerTeamToday,
  TEAM_STATUS_LABELS,
  type TeamMemberStatus,
  type TeamTodayMember,
} from '@/lib/timegate/manager'
import { formatMinutes } from '@/lib/timegate/timesheets'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

function isoTodayLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function shiftIsoDate(iso: string, deltaDays: number): string {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + deltaDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDateLabel(iso: string, todayIso: string): string {
  if (iso === todayIso) return "Aujourd'hui"
  if (iso === shiftIsoDate(todayIso, -1)) return 'Hier'
  if (iso === shiftIsoDate(todayIso, 1)) return 'Demain'
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function memberInitials(member: TeamTodayMember): string {
  const fromEmployee = `${member.employee?.firstName?.[0] ?? ''}${member.employee?.lastName?.[0] ?? ''}`.toUpperCase()
  if (fromEmployee.trim()) return fromEmployee
  const parts = member.employeeName.trim().split(/\s+/)
  const a = parts[0]?.[0] ?? ''
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
  return `${a}${b}`.toUpperCase() || '?'
}

function formatLastEvent(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

type SummaryCardDef = {
  key: TeamMemberStatus | 'ALL'
  label: string
  value: number
  icon: string
  accent: string
}

export default function ManagerTeamPage() {
  const today = useMemo(() => isoTodayLocal(), [])
  const [date, setDate] = useState(today)
  const [branchId, setBranchId] = useState('')
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([])
  const [members, setMembers] = useState<TeamTodayMember[]>([])
  const [summary, setSummary] = useState<Record<string, number> | null>(null)
  const [statusFilter, setStatusFilter] = useState<TeamMemberStatus | 'ALL'>('ALL')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isFuture = date > today

  useEffect(() => {
    void listBranches({ limit: 100 }).then((res) => setBranchOptions(toSelectOptions(res.data)))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getManagerTeamToday({
        date,
        ...(branchId ? { branchId } : {}),
      })
      setMembers(res.members)
      setSummary(res.summary)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [date, branchId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setStatusFilter('ALL')
  }, [date])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members.filter((m) => {
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false
      if (!q) return true
      const hay = [
        m.employeeName,
        m.department,
        m.branch?.name,
        TEAM_STATUS_LABELS[m.status],
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [members, statusFilter, query])

  const summaryCards: SummaryCardDef[] = useMemo(() => {
    const cards: SummaryCardDef[] = [
      {
        key: 'ALL',
        label: 'Total',
        value: summary?.total ?? 0,
        icon: 'fa-users',
        accent: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
      },
      {
        key: 'PRESENT',
        label: 'Présents',
        value: summary?.present ?? 0,
        icon: 'fa-circle-check',
        accent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      },
    ]

    if (!isFuture) {
      cards.push({
        key: 'ABSENT',
        label: 'Absents',
        value: summary?.absent ?? 0,
        icon: 'fa-user-xmark',
        accent: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
      })
    }

    cards.push({
      key: 'EXPECTED',
      label: 'Prévus',
      value: summary?.expected ?? 0,
      icon: 'fa-calendar-day',
      accent: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    })

    cards.push(
      {
        key: 'LATE',
        label: 'Retards',
        value: summary?.late ?? 0,
        icon: 'fa-clock',
        accent: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      },
      {
        key: 'ON_BREAK',
        label: 'En pause',
        value: summary?.onBreak ?? 0,
        icon: 'fa-mug-saucer',
        accent: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
      },
      {
        key: 'ON_LEAVE',
        label: 'Congés',
        value: summary?.onLeave ?? 0,
        icon: 'fa-umbrella-beach',
        accent: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
      },
      {
        key: 'REVIEW_REQUIRED',
        label: 'À valider',
        value: summary?.reviewRequired ?? 0,
        icon: 'fa-triangle-exclamation',
        accent: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
      },
    )

    return cards
  }, [summary, isFuture])

  const datePresets = [
    { label: 'Hier', value: shiftIsoDate(today, -1) },
    { label: "Aujourd'hui", value: today },
    { label: 'Demain', value: shiftIsoDate(today, 1) },
  ]

  return (
    <div className="space-y-4" data-tour="manager-team">
      <PageHeader
        breadcrumbs={[
          { label: 'Manager', href: '/' },
          { label: 'Équipe du jour' },
        ]}
        action={
          <Link href="/manager/inbox" className={secondaryBtnClass}>
            <i className="fa-solid fa-inbox" />
            Boite de réception
          </Link>
        }
      />

      <ApiErrorBanner message={error} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        {summaryCards.map((card) => (
          <TeamSummaryCard
            key={card.key}
            label={card.label}
            value={card.value}
            icon={card.icon}
            accent={card.accent}
            active={statusFilter === card.key}
            onClick={() => setStatusFilter(card.key)}
          />
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-surface-card shadow-sm dark:border-border-dark dark:bg-surface-card-dark">
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-200/80 px-4 py-3 dark:border-border-dark">
          <div className="min-w-40">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Date
            </label>
            <DateField
              variant="toolbar"
              value={date}
              onChange={setDate}
              placeholder="Date"
            />
          </div>

          <div className="min-w-48 flex-1 sm:max-w-xs">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Branche
            </label>
            <SelectSearch
              instanceId="manager-team-branch"
              variant="toolbar"
              options={branchOptions}
              value={findOption(branchOptions, branchId)}
              onChange={(opt) => setBranchId(opt?.value ?? '')}
              placeholder="Toutes"
              isClearable={Boolean(branchId)}
            />
          </div>

          <div className="min-w-48 flex-1 sm:max-w-sm">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              Recherche
            </label>
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom, branche, statut…"
                className="block w-full rounded-lg border border-slate-200/80 bg-surface py-2 pl-9 pr-3 text-sm focus:border-primary focus:ring-primary dark:border-border-dark dark:bg-surface-dark dark:text-slate-200"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pb-0.5">
            <IconMenuDropdown
              options={datePresets}
              value={date}
              onChange={setDate}
              ariaLabel="Raccourcis de date"
            />
            <button
              type="button"
              onClick={() => void load()}
              className={`${primaryBtnClass} px-3! py-2! text-xs`}
              title="Actualiser"
            >
              <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 px-4 py-2.5 dark:border-border-dark">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">
              {formatDateLabel(date, today)}
            </span>
            <span className="text-slate-400"> · </span>
            {filtered.length} collaborateur{filtered.length === 1 ? '' : 's'}
            {statusFilter !== 'ALL' ? (
              <span className="text-slate-400">
                {' '}
                · filtre « {TEAM_STATUS_LABELS[statusFilter]} »
              </span>
            ) : null}
          </p>
          {isFuture ? (
            <p className="text-xs text-indigo-600 dark:text-indigo-300">
              Jour à venir — les absences ne sont pas encore calculées
            </p>
          ) : date === today ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Absent uniquement après l&apos;heure de fin de vacation
            </p>
          ) : null}
        </div>

        <div className="min-h-96">
          {loading ? (
            <div className="divide-y divide-slate-100 dark:divide-border-dark">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="size-10 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    <div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                  <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex min-h-96 flex-col items-center justify-center gap-2 px-6 text-center">
              <div className="mb-2 flex size-14 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/10">
                <i className="fa-solid fa-users text-2xl" />
              </div>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                Aucun collaborateur
              </p>
              <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
                Aucun résultat pour ce filtre ou cette branche.
              </p>
              {statusFilter !== 'ALL' || query ? (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('ALL')
                    setQuery('')
                  }}
                  className="mt-2 text-sm font-medium text-primary hover:underline"
                >
                  Réinitialiser les filtres
                </button>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-border-dark">
              {filtered.map((member) => {
                const style = TEAM_STATUS_STYLES[member.status]
                const lastAt = formatLastEvent(member.lastEventAt)
                return (
                  <li
                    key={member.employeeId}
                    className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50/80 dark:hover:bg-white/3"
                  >
                    <div className="relative shrink-0">
                      <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary dark:bg-primary/20 dark:text-accent">
                        {memberInitials(member)}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-white dark:border-surface-card-dark ${style.dot}`}
                        title={TEAM_STATUS_LABELS[member.status]}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900 dark:text-white">
                        {member.employeeName}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {[member.branch?.name, member.department].filter(Boolean).join(' · ') ||
                          '—'}
                        {lastAt ? ` · dernier pointage ${lastAt}` : ''}
                        {member.workedMinutes > 0
                          ? ` · ${formatMinutes(member.workedMinutes)}`
                          : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {member.lateMinutes > 0 ? (
                        <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                          +{member.lateMinutes} min
                        </span>
                      ) : null}
                      {member.pendingReviewEvents > 0 ? (
                        <Link
                          href="/manager/inbox"
                          className="text-xs font-medium text-orange-600 hover:underline dark:text-orange-300"
                        >
                          {member.pendingReviewEvents} à valider
                        </Link>
                      ) : null}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.badge}`}
                      >
                        <i className={`fa-solid ${style.icon} text-[10px] opacity-80`} aria-hidden />
                        {TEAM_STATUS_LABELS[member.status]}
                      </span>
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
