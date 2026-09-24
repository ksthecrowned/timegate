'use client'

import {
  TEAM_STATUS_STYLES,
  TeamSummaryCard,
} from '@/components/manager/TeamSummaryCard'
import { ApiErrorBanner, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import PageHeader from '@/components/ui/PageHeader'
import { HttpError } from '@/lib/http'
import {
  getManagerControlCenter,
  TEAM_STATUS_LABELS,
  type ControlCenterAttention,
  type ControlCenterResponse,
  type ControlCenterSite,
  type TeamMemberStatus,
} from '@/lib/timegate/manager'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

function PresenceStrip({
  summary,
}: {
  summary: ControlCenterResponse['presence']
}) {
  const cards: Array<{
    key: TeamMemberStatus | 'ALL'
    label: string
    value: number
    icon: string
    accent: string
  }> = [
    {
      key: 'PRESENT',
      label: 'Présents',
      value: summary.present,
      icon: 'fa-circle-check',
      accent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    },
    {
      key: 'ON_BREAK',
      label: 'Pause',
      value: summary.onBreak,
      icon: 'fa-mug-saucer',
      accent: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
    },
    {
      key: 'LATE',
      label: 'Non arrivés',
      value: summary.late,
      icon: 'fa-clock',
      accent: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    },
    {
      key: 'ABSENT',
      label: 'Absents',
      value: summary.absent,
      icon: 'fa-user-xmark',
      accent: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    },
    {
      key: 'REVIEW_REQUIRED',
      label: 'À valider',
      value: summary.reviewRequired,
      icon: 'fa-triangle-exclamation',
      accent: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-tour="manager-control">
      {cards.map((c) => (
        <TeamSummaryCard
          key={c.key}
          label={c.label}
          value={c.value}
          icon={c.icon}
          accent={c.accent}
          active={false}
          onClick={() => {
            window.location.href = `/manager/team?status=${c.key}`
          }}
        />
      ))}
    </div>
  )
}

function SiteRow({ site }: { site: ControlCenterSite }) {
  const issues = site.absent + site.late + site.reviewRequired
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-border-dark">
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-900 dark:text-white">{site.name}</p>
        <p className="text-xs text-slate-500">
          {[site.type, site.clientLabel].filter(Boolean).join(' · ') || 'Lieu de pointage'}
          {' · '}
          {site.total} personne{site.total === 1 ? '' : 's'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
          {site.present + site.onBreak} sur site
        </span>
        {issues > 0 ? (
          <span className="rounded-md bg-orange-50 px-2 py-1 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
            {issues} à traiter
          </span>
        ) : (
          <span className="rounded-md bg-slate-50 px-2 py-1 text-slate-600 dark:bg-white/5 dark:text-slate-300">
            OK
          </span>
        )}
      </div>
    </div>
  )
}

function AttentionRow({ row }: { row: ControlCenterAttention }) {
  const style = TEAM_STATUS_STYLES[row.status]
  return (
    <Link
      href={`/employees/${row.employeeId}`}
      className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0 hover:bg-slate-50/80 dark:border-border-dark dark:hover:bg-white/5"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
          {row.employeeName}
        </p>
        <p className="text-xs text-slate-500">
          {row.pendingReviewEvents > 0
            ? `${row.pendingReviewEvents} pointage(s) à valider`
            : TEAM_STATUS_LABELS[row.status]}
        </p>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${style.badge}`}>
        {TEAM_STATUS_LABELS[row.status]}
      </span>
    </Link>
  )
}

export default function ManagerControlPage() {
  const [data, setData] = useState<ControlCenterResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await getManagerControlCenter())
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Impossible de charger le centre de contrôle.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Centre de contrôle' }]}
        action={
          <div className="flex flex-wrap gap-2">
            <button type="button" className={secondaryBtnClass} onClick={() => void load()}>
              Actualiser
            </button>
            <Link href="/manager/inbox" className={primaryBtnClass}>
              Inbox
            </Link>
          </div>
        }
      />
      <ApiErrorBanner message={error} />

      {loading && !data ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : data ? (
        <div className="space-y-6">
          <section>
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Présence maintenant
              </h2>
              <p className="text-xs text-slate-400">{data.date}</p>
            </div>
            <PresenceStrip summary={data.presence} />
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200/80 bg-surface-card p-4 shadow-sm dark:border-border-dark dark:bg-surface-card-dark lg:col-span-2">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Sites / lieux
                </h2>
                <Link href="/locations" className="text-xs text-primary hover:underline">
                  Gérer
                </Link>
              </div>
              {data.sites.length === 0 ? (
                <p className="text-sm text-slate-500">Aucun lieu actif.</p>
              ) : (
                data.sites.map((site) => (
                  <SiteRow key={site.locationId ?? 'none'} site={site} />
                ))
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200/80 bg-surface-card p-4 shadow-sm dark:border-border-dark dark:bg-surface-card-dark">
                <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">
                  Anomalies
                </h2>
                <p className="text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">
                  {data.anomalies.open}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {data.anomalies.attendanceEvents} pointages · {data.anomalies.punchClaims}{' '}
                  réclamations · {data.anomalies.timesheetDays} journées
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/anomalies" className={primaryBtnClass}>
                    Traiter
                  </Link>
                  <Link href="/manager/inbox" className={secondaryBtnClass}>
                    Inbox
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-surface-card p-4 shadow-sm dark:border-border-dark dark:bg-surface-card-dark">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Attention
                  </h2>
                  <Link href="/manager/team" className="text-xs text-primary hover:underline">
                    Équipe
                  </Link>
                </div>
                {data.attention.length === 0 ? (
                  <p className="text-sm text-slate-500">Rien à signaler.</p>
                ) : (
                  data.attention.map((row) => <AttentionRow key={row.employeeId} row={row} />)
                )}
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
