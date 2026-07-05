'use client'

import DashboardAnalytics from '@/components/dashboard/DashboardAnalytics'
import { SkeletonChartCard, SkeletonDashboard } from '@/components/ui/Skeleton'
import { HttpError } from '@/lib/http'
import { loadDashboardData, type DashboardStats } from '@/lib/timegate/dashboard-stats'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

function StatCard({
  label,
  value,
  href,
  icon,
  accent,
}: {
  label: string
  value: number
  href: string
  icon: string
  accent?: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col tg-card shadow-2xs hover:border-primary/40 transition-colors"
    >
      <div className="p-4 md:px-5 md:py-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase text-slate-500 dark:text-slate-500">{label}</p>
          <i className={`${icon} ${accent ?? 'text-primary'}`} />
        </div>
        <h3 className="mt-2 text-2xl font-semibold text-gray-800 dark:text-neutral-200">
          {value.toLocaleString('fr-FR')}
        </h3>
      </div>
    </Link>
  )
}

const INITIAL_LOAD = {
  employees: 0,
  branches: 0,
  kiosks: 0,
  attendanceDays: 0,
  absences: 0,
  lateRecords: 0,
  pendingLeaves: 0,
  timesheetDays: 0,
}

export default function DashboardPage() {
  useSession()
  const [stats, setStats] = useState<DashboardStats>(INITIAL_LOAD)
  const [chartData, setChartData] = useState<Awaited<ReturnType<typeof loadDashboardData>> | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await loadDashboardData()
      setStats(data.stats)
      setChartData(data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const isInitialLoad = loading && !chartData

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tableau de bord</h1>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-black/10 dark:bg-white/10 px-3 py-2 text-sm text-gray-700 hover:border-primary/40 disabled:opacity-50 dark:border-border-dark dark:text-neutral-200"
        >
          <i className={`fa-solid fa-rotate-right ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {isInitialLoad ? (
        <SkeletonDashboard />
      ) : (
        <>
          <div
            className={`grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 transition-opacity ${loading ? 'opacity-60' : ''}`}
          >
            <StatCard
              label="Employés"
              value={stats.employees}
              href="/employees"
              icon="fa-solid fa-users"
            />
            <StatCard
              label="Branches"
              value={stats.branches}
              href="/branches"
              icon="fa-solid fa-building"
            />
            <StatCard
              label="Kiosques"
              value={stats.kiosks}
              href="/kiosks"
              icon="fa-solid fa-tablet-screen-button"
            />
            <StatCard
              label="Jours de présence"
              value={stats.attendanceDays}
              href="/attendance/days"
              icon="fa-solid fa-calendar-check"
            />
          </div>

          <div
            className={`grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 transition-opacity ${loading ? 'opacity-60' : ''}`}
          >
            <StatCard
              label="Absences (30 j)"
              value={stats.absences}
              href="/absences"
              icon="fa-solid fa-user-xmark"
              accent="text-red-500"
            />
            <StatCard
              label="Retards (30 j)"
              value={stats.lateRecords}
              href="/late-records"
              icon="fa-solid fa-clock"
              accent="text-amber-500"
            />
            <StatCard
              label="Congés en attente"
              value={stats.pendingLeaves}
              href="/leaves"
              icon="fa-solid fa-plane-departure"
              accent="text-blue-500"
            />
            <StatCard
              label="Feuilles de temps"
              value={stats.timesheetDays}
              href="/timesheets"
              icon="fa-solid fa-file-lines"
              accent="text-teal-500"
            />
          </div>

          {loading && chartData ? (
            <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonChartCard key={i} />
              ))}
            </div>
          ) : chartData ? (
            <DashboardAnalytics data={chartData} />
          ) : null}
        </>
      )}

      <div className="tg-card shadow-2xs p-5">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-4">Accès rapide</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { href: '/employees', label: 'Employés', icon: 'fa-users' },
            { href: '/attendance/events', label: 'Événements', icon: 'fa-clock' },
            { href: '/timesheets', label: 'Timesheets', icon: 'fa-file-lines' },
            { href: '/payroll-runs', label: 'Paie', icon: 'fa-money-bill-wave' },
            { href: '/holidays', label: 'Fériés', icon: 'fa-calendar-days' },
            { href: '/leaves', label: 'Congés', icon: 'fa-plane-departure' },
            { href: '/branches', label: 'Branches', icon: 'fa-building' },
            { href: '/kiosks', label: 'Kiosques', icon: 'fa-tablet-screen-button' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200/80 hover:border-primary hover:text-primary dark:border-border-dark text-sm gap-2"
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
