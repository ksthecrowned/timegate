'use client'

import StartTourButton from '@/components/tour/StartTourButton'
import OrgSetupReminderBanner from '@/components/tour/OrgSetupReminderBanner'
import DashboardAnalytics from '@/components/dashboard/DashboardAnalytics'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { SkeletonChartCard, SkeletonDashboard } from '@/components/ui/Skeleton'
import { HttpError } from '@/lib/http'
import {
  fetchDashboardHome,
  type DashboardHome,
} from '@/lib/timegate/dashboard-home'
import { loadDashboardData, type DashboardChartData } from '@/lib/timegate/dashboard-stats'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

function StatCard({
  label,
  value,
  href,
  icon,
  accent,
  hint,
}: {
  label: string
  value: number
  href: string
  icon: string
  accent?: string
  hint?: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col tg-card shadow-2xs transition-colors hover:border-primary/40"
    >
      <div className="p-4 md:px-5 md:py-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
          <i className={`${icon} ${accent ?? 'text-primary'}`} />
        </div>
        <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {value.toLocaleString('fr-FR')}
        </h3>
        {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
      </div>
    </Link>
  )
}

function TodayMetric({
  label,
  value,
  href,
  tone,
}: {
  label: string
  value: number
  href?: string
  tone?: 'default' | 'warn' | 'danger' | 'ok'
}) {
  const toneClass =
    tone === 'warn'
      ? 'text-amber-700 dark:text-amber-300'
      : tone === 'danger'
        ? 'text-red-700 dark:text-red-300'
        : tone === 'ok'
          ? 'text-emerald-700 dark:text-emerald-300'
          : 'text-slate-900 dark:text-slate-100'

  const content = (
    <div className="rounded-lg border border-slate-200/80 bg-surface px-3 py-2.5 dark:border-border-dark dark:bg-surface-dark">
      <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className={`mt-1 text-xl font-semibold ${toneClass}`}>{value.toLocaleString('fr-FR')}</p>
    </div>
  )

  if (!href) return content
  return (
    <Link href={href} className="block transition-opacity hover:opacity-90">
      {content}
    </Link>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const role = session?.user?.role
  const isAdmin = role === 'ADMIN'

  const [home, setHome] = useState<DashboardHome | null>(null)
  const [chartData, setChartData] = useState<DashboardChartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [homeData, charts] = await Promise.all([
        fetchDashboardHome(),
        loadDashboardData(),
      ])
      setHome(homeData)
      setChartData({
        ...charts,
        planningVsActual: homeData.planningVsActual ?? charts.planningVsActual,
      })
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const todayLabel = useMemo(() => {
    if (!home?.date) return ''
    return new Date(`${home.date}T12:00:00`).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }, [home?.date])

  const isInitialLoad = loading && !home

  const quickLinks = isAdmin
    ? [
        { href: '/employees', label: 'Employés', icon: 'fa-users' },
        { href: '/manager/inbox', label: 'À traiter', icon: 'fa-inbox' },
        { href: '/attendance/days', label: 'Registre présence', icon: 'fa-calendar-day' },
        { href: '/timesheets', label: 'Temps travaillé', icon: 'fa-file-lines' },
        { href: '/payroll-runs', label: 'Cycles de paie', icon: 'fa-money-bill-wave' },
        { href: '/leaves', label: 'Demandes congé', icon: 'fa-plane-departure' },
        { href: '/branches', label: 'Branches', icon: 'fa-building' },
        { href: '/kiosks', label: 'Bornes', icon: 'fa-tablet-screen-button' },
      ]
    : [
        { href: '/manager/team', label: 'Équipe du jour (live)', icon: 'fa-users' },
        { href: '/manager/inbox', label: 'À traiter', icon: 'fa-inbox' },
        { href: '/manager/leaves', label: 'Absences équipe', icon: 'fa-calendar-days' },
        { href: '/attendance/events', label: 'Pointages', icon: 'fa-clock' },
        { href: '/timesheets', label: 'Temps travaillé', icon: 'fa-file-lines' },
        { href: '/planning', label: 'Planning prévu', icon: 'fa-calendar-week' },
        { href: '/late-records', label: 'Retards', icon: 'fa-clock' },
        { href: '/trusted-devices', label: 'Téléphones', icon: 'fa-mobile-screen' },
      ]

  return (
    <div className="space-y-6">
      <OrgSetupReminderBanner />
      <div className="flex flex-wrap items-center justify-between gap-4" data-tour="home-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Tableau de bord</h1>
          {todayLabel ? (
            <p className="mt-1 text-sm capitalize text-slate-500 dark:text-slate-400">
              {todayLabel}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StartTourButton />
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200/80 bg-surface px-3 py-2 text-sm text-slate-700 hover:border-primary/40 disabled:opacity-50 dark:border-border-dark dark:bg-surface-dark dark:text-slate-200"
          >
            <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      </div>

      <ApiErrorBanner message={error} />

      {isInitialLoad ? (
        <SkeletonDashboard />
      ) : home ? (
        <>
          <section
            data-tour="home-today"
            className={`tg-card space-y-4 p-4 md:p-5 ${loading ? 'opacity-60' : ''}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Aujourd&apos;hui
              </h2>
              <Link
                href="/manager/team"
                className="text-xs font-medium text-primary hover:underline dark:text-accent"
              >
                Voir l&apos;équipe
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <TodayMetric label="Présents" value={home.today.present} href="/manager/team" tone="ok" />
              <TodayMetric label="Absents" value={home.today.absent} href="/absences" tone="danger" />
              <TodayMetric label="En congé" value={home.today.onLeave} href="/manager/leaves" />
              <TodayMetric label="Retards" value={home.today.late} href="/late-records" tone="warn" />
              <TodayMetric
                label="À valider"
                value={home.today.reviewEventsToday + home.today.reviewRequired}
                href="/manager/inbox"
                tone="warn"
              />
              <TodayMetric
                label="Inbox"
                value={home.today.inboxTotal}
                href="/manager/inbox"
                tone={home.today.inboxTotal > 0 ? 'warn' : 'default'}
              />
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>
                Kiosks offline :{' '}
                <span
                  className={
                    home.today.kiosksOffline > 0
                      ? 'font-semibold text-amber-700 dark:text-amber-300'
                      : 'font-semibold text-slate-700 dark:text-slate-200'
                  }
                >
                  {home.today.kiosksOffline}/{home.today.kiosksTotal}
                </span>
              </span>
              <Link href="/kiosks" className="font-medium text-primary hover:underline dark:text-accent">
                Voir les kiosques
              </Link>
            </div>
          </section>

          <div
            data-tour="home-kpis"
            className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-6 transition-opacity ${loading ? 'opacity-60' : ''}`}
          >
            {isAdmin ? (
              <>
                <StatCard
                  label="Employés"
                  value={home.kpis.employees}
                  href="/employees"
                  icon="fa-solid fa-users"
                />
                <StatCard
                  label="Branches"
                  value={home.kpis.branches}
                  href="/branches"
                  icon="fa-solid fa-building"
                />
                <StatCard
                  label="Kiosques"
                  value={home.kpis.kiosks}
                  href="/kiosks"
                  icon="fa-solid fa-tablet-screen-button"
                />
                <StatCard
                  label="Couverture (30 j)"
                  value={home.kpis.coveragePercent ?? 0}
                  href="/planning"
                  icon="fa-solid fa-chart-pie"
                  hint={
                    home.kpis.coveragePercent == null
                      ? 'Pas de planning'
                      : `${Math.round(home.kpis.workedMinutes / 60)} h / ${Math.round(home.kpis.plannedMinutes / 60)} h`
                  }
                />
              </>
            ) : null}
            <StatCard
              label="Absences non just. (30 j)"
              value={home.kpis.absences30}
              href="/absences"
              icon="fa-solid fa-user-xmark"
              accent="text-red-500"
            />
            <StatCard
              label="Retards à justifier (30 j)"
              value={home.kpis.late30}
              href="/late-records"
              icon="fa-solid fa-clock"
              accent="text-amber-500"
            />
            <StatCard
              label="Congés en attente"
              value={home.kpis.pendingLeaves}
              href={isAdmin ? '/leaves' : '/manager/inbox'}
              icon="fa-solid fa-plane-departure"
              accent="text-sky-500"
            />
            <StatCard
              label="Temps travaillé (30 j)"
              value={home.kpis.timesheets30}
              href="/timesheets"
              icon="fa-solid fa-file-lines"
              accent="text-teal-500"
            />
          </div>

          {loading && chartData ? (
            <div data-tour="home-analytics" className="grid gap-4 sm:gap-6 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonChartCard key={i} />
              ))}
            </div>
          ) : chartData ? (
            <div data-tour="home-analytics">
              <DashboardAnalytics data={chartData} />
            </div>
          ) : null}
        </>
      ) : null}

      <div data-tour="home-quick" className="tg-card p-5 shadow-2xs">
        <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-white">Accès rapide</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200/80 p-4 text-sm text-slate-700 hover:border-primary hover:text-primary dark:border-border-dark dark:text-slate-200"
            >
              <i className={`fa-solid ${item.icon} text-lg`} />
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
