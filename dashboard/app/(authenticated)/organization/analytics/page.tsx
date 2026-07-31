'use client'

import { useEffect, useMemo, useState } from 'react'
import { BarChart } from '@/components/dashboard/Charts'
import { ApiErrorBanner, FormCard } from '@/components/timegate/ui'
import { HintTooltip } from '@/components/ui/HintTooltip'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonBlock } from '@/components/ui/Skeleton'
import { formatApiDateShort } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'
import {
  getAnalyticsFunnel,
  type AnalyticsFunnelResponse,
} from '@/lib/timegate/analytics'

const EVENT_LABELS: Record<string, string> = {
  'employee.login_success': 'Connexions',
  'employee.qr_punch_success': 'Pointages QR',
  'employee.leave_request_submitted': 'Demandes de congé',
}

const CONVERSIONS: {
  key: keyof AnalyticsFunnelResponse['conversion']
  label: string
  hint: string
}[] = [
  {
    key: 'loginToQr',
    label: 'Login → QR',
    hint: 'Part des utilisateurs connectés qui ont aussi pointé en QR sur la période.',
  },
  {
    key: 'loginToLeave',
    label: 'Login → Congé',
    hint: 'Part des utilisateurs connectés qui ont soumis une demande de congé.',
  },
  {
    key: 'qrToLeave',
    label: 'QR → Congé',
    hint: 'Part des utilisateurs ayant pointé en QR qui ont aussi demandé un congé.',
  },
]

function pct(value: number | null): string {
  if (value == null) return '—'
  return `${value.toLocaleString('fr-FR')} %`
}

export default function ProductAnalyticsPage() {
  const [data, setData] = useState<AnalyticsFunnelResponse | null>(null)
  const [days, setDays] = useState(30)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError('')
    void getAnalyticsFunnel(days)
      .then(setData)
      .catch((err) => {
        setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
        setData(null)
      })
      .finally(() => setLoading(false))
  }, [days])

  const chartDays = useMemo(() => {
    if (!data) return []
    return data.daily.slice(-Math.min(days, data.daily.length))
  }, [data, days])

  const hasActivity = chartDays.some((d) => d.login + d.qr + d.leave > 0)

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Configuration organisation', href: '/organization' },
          { label: 'Analytics produit' },
        ]}
      />

      <div className="flex gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              days === d
                ? 'bg-primary text-white'
                : 'border border-slate-200/80 text-slate-600 hover:bg-slate-50 dark:border-border-dark dark:text-slate-300 dark:hover:bg-white/5'
            }`}
          >
            {d} j
          </button>
        ))}
      </div>

      <ApiErrorBanner message={error} />

      {loading ? (
        <div className="space-y-4">
          <div className="tg-card grid gap-4 p-5 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <SkeletonBlock className="h-3 w-24 rounded-full" />
                <SkeletonBlock className="h-8 w-16" />
                <SkeletonBlock className="h-3 w-32 rounded-full" />
              </div>
            ))}
          </div>
          <div className="tg-card grid gap-4 p-5 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <SkeletonBlock className="h-3 w-20 rounded-full" />
                <SkeletonBlock className="h-8 w-14" />
              </div>
            ))}
          </div>
          <div className="tg-card p-5">
            <SkeletonBlock className="mb-4 h-4 w-40 rounded-full" />
            <SkeletonBlock className="h-64 w-full" />
          </div>
        </div>
      ) : null}

      {!loading && data ? (
        <>
          <div className="tg-card border-t-4 border-t-primary grid gap-4 p-5 sm:grid-cols-3">
            {Object.entries(EVENT_LABELS).map(([key, label]) => {
              const stats = data.events[key]
              return (
                <div key={key}>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                    {(stats?.total ?? 0).toLocaleString('fr-FR')}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {(stats?.uniqueUsers ?? 0).toLocaleString('fr-FR')} utilisateurs uniques
                  </p>
                </div>
              )
            })}
          </div>

          <div className="tg-card grid gap-4 p-5 sm:grid-cols-3">
            {CONVERSIONS.map((item) => (
              <div key={item.key}>
                <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {item.label}
                  <HintTooltip text={item.hint} />
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                  {pct(data.conversion[item.key])}
                </p>
              </div>
            ))}
          </div>

          <FormCard
            title="Activité quotidienne"
            hint={`Connexions, pointages QR et demandes de congé — ${days} derniers jours.`}
          >
            {hasActivity ? (
              <BarChart
                stacked
                categories={chartDays.map((row) => formatApiDateShort(row.date))}
                series={[
                  { name: 'Login', data: chartDays.map((row) => row.login) },
                  { name: 'QR', data: chartDays.map((row) => row.qr) },
                  { name: 'Congé', data: chartDays.map((row) => row.leave) },
                ]}
              />
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aucun événement sur la période. Les compteurs se rempliront après connexions, QR ou
                demandes depuis l’app employé.
              </p>
            )}
          </FormCard>
        </>
      ) : null}
    </div>
  )
}
