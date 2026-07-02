'use client'

import { ApiErrorBanner, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import PageHeader from '@/components/ui/PageHeader'
import { HttpError } from '@/lib/http'
import { listBranches } from '@/lib/timegate/branches'
import {
  getManagerTeamToday,
  TEAM_STATUS_LABELS,
  type TeamMemberStatus,
  type TeamTodayMember,
} from '@/lib/timegate/manager'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

const STATUS_COLORS: Record<TeamMemberStatus, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-800',
  ABSENT: 'bg-red-100 text-red-800',
  LATE: 'bg-amber-100 text-amber-800',
  ON_BREAK: 'bg-sky-100 text-sky-800',
  ON_LEAVE: 'bg-violet-100 text-violet-800',
  REVIEW_REQUIRED: 'bg-orange-100 text-orange-800',
  OFF: 'bg-slate-100 text-slate-600',
}

function SummaryCard({
  label,
  value,
  active,
  onClick,
}: {
  label: string
  value: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tg-card shadow-2xs p-4 text-left transition-colors ${
        active ? 'ring-2 ring-primary/50 border-primary/30' : 'hover:border-primary/20'
      }`}
    >
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{value}</p>
    </button>
  )
}

export default function ManagerTeamPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [branchId, setBranchId] = useState('')
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([])
  const [members, setMembers] = useState<TeamTodayMember[]>([])
  const [summary, setSummary] = useState<Record<string, number> | null>(null)
  const [statusFilter, setStatusFilter] = useState<TeamMemberStatus | 'ALL'>('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void listBranches({ limit: 100 }).then((res) =>
      setBranches(res.data.map((b) => ({ id: b.id, name: b.name }))),
    )
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

  const filtered = useMemo(
    () =>
      statusFilter === 'ALL'
        ? members
        : members.filter((m) => m.status === statusFilter),
    [members, statusFilter],
  )

  const summaryCards: Array<{ key: TeamMemberStatus | 'ALL'; label: string; value: number }> = [
    { key: 'ALL', label: 'Total', value: summary?.total ?? 0 },
    { key: 'PRESENT', label: 'Présents', value: summary?.present ?? 0 },
    { key: 'ABSENT', label: 'Absents', value: summary?.absent ?? 0 },
    { key: 'LATE', label: 'Retards', value: summary?.late ?? 0 },
    { key: 'ON_BREAK', label: 'En pause', value: summary?.onBreak ?? 0 },
    { key: 'ON_LEAVE', label: 'Congés', value: summary?.onLeave ?? 0 },
    { key: 'REVIEW_REQUIRED', label: 'À valider', value: summary?.reviewRequired ?? 0 },
  ]

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Manager', href: '/' },
          { label: 'Équipe du jour' }
        ]}
        // title="Équipe du jour"
        // subtitle="Présents, absents, retards et pauses en temps réel."
        action={
          <Link href="/manager/inbox" className={secondaryBtnClass}>
            <i className="fa-solid fa-inbox" />
            Boîte de réception
          </Link>
        }
      />

      <ApiErrorBanner message={error} />

      <div className="mb-6 flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          <span className="block text-gray-500 mb-1">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-border-dark dark:bg-neutral-900"
          />
        </label>
        <label className="text-sm">
          <span className="block text-gray-500 mb-1">Branche</span>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm min-w-[180px] dark:border-border-dark dark:bg-neutral-900"
          >
            <option value="">Toutes</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => void load()} className={primaryBtnClass}>
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {summaryCards.map((card) => (
          <SummaryCard
            key={card.key}
            label={card.label}
            value={card.value}
            active={statusFilter === card.key}
            onClick={() => setStatusFilter(card.key)}
          />
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500">Aucun employé pour ce filtre.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((member) => (
            <li
              key={member.employeeId}
              className="tg-card shadow-2xs px-4 py-3 flex flex-wrap items-center justify-between gap-3"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{member.employeeName}</p>
                <p className="text-xs text-gray-500">
                  {[member.branch?.name, member.department].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {member.lateMinutes > 0 && (
                  <span className="text-xs text-amber-700">+{member.lateMinutes} min</span>
                )}
                {member.pendingReviewEvents > 0 && (
                  <Link href="/manager/inbox" className="text-xs text-orange-600 hover:underline">
                    {member.pendingReviewEvents} à valider
                  </Link>
                )}
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    STATUS_COLORS[member.status]
                  }`}
                >
                  {TEAM_STATUS_LABELS[member.status]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
