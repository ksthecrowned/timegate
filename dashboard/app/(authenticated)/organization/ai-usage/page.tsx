'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart } from '@/components/dashboard/Charts'
import { ApiErrorBanner, FormCard } from '@/components/timegate/ui'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonBlock } from '@/components/ui/Skeleton'
import { formatApiDateShort } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'
import {
  getAiUsage,
  getAiUsageHistory,
  type AiUsageSummary,
} from '@/lib/timegate/copilot'

type HistoryData = {
  daily: Array<{ date: string; tokens: number }>
  sessions: number
}

function periodDaysOptions(days: number) {
  return [7, 30].includes(days) ? days : 30
}

export default function AiUsagePage() {
  const [usage, setUsage] = useState<AiUsageSummary | null>(null)
  const [history, setHistory] = useState<HistoryData | null>(null)
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [usageData, historyData] = await Promise.all([getAiUsage(), getAiUsageHistory()])
      setUsage(usageData)
      setHistory(historyData)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
      setUsage(null)
      setHistory(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const chartDays = periodDaysOptions(days)
  const dailySlice = useMemo(() => {
    const rows = history?.daily ?? []
    return rows.slice(-chartDays)
  }, [history, chartDays])

  const hasChartData = dailySlice.some((row) => row.tokens > 0)
  const quotaPercent =
    usage && !usage.unlimited && usage.percent != null
      ? Math.min(100, Math.max(0, usage.percent))
      : null

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Configuration organisation', href: '/organization' },
          { label: 'Consommation IA' },
        ]}
      />

      <ApiErrorBanner message={error} />

      <div className="flex gap-2">
        {[7, 30].map((d) => (
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

      {loading ? (
        <div className="space-y-4">
          <div className="tg-card grid gap-4 p-5 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-2">
                <SkeletonBlock className="h-3 w-28 rounded-full" />
                <SkeletonBlock className="h-8 w-20" />
              </div>
            ))}
          </div>
          <div className="tg-card p-5">
            <SkeletonBlock className="mb-4 h-4 w-48 rounded-full" />
            <SkeletonBlock className="h-64 w-full" />
          </div>
        </div>
      ) : null}

      {!loading && usage ? (
        <>
          <div className="tg-card border-t-4 border-t-primary grid gap-5 p-5 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Tokens utilisés (mois)
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                {usage.usedTokens.toLocaleString('fr-FR')}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Quota mensuel
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                {usage.unlimited || usage.quotaTokens == null
                  ? 'Illimité'
                  : usage.quotaTokens.toLocaleString('fr-FR')}
              </p>
              {quotaPercent != null ? (
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Consommation</span>
                    <span className="tabular-nums">{quotaPercent.toLocaleString('fr-FR')} %</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                    <div
                      className={`h-full rounded-full transition-all ${
                        quotaPercent >= 90
                          ? 'bg-red-500'
                          : quotaPercent >= 70
                            ? 'bg-amber-500'
                            : 'bg-primary'
                      }`}
                      style={{ width: `${quotaPercent}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Sessions (30 j)
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
                {(history?.sessions ?? 0).toLocaleString('fr-FR')}
              </p>
              {!usage.enabled ? (
                <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                  Copilot désactivé sur ce plan.
                </p>
              ) : null}
            </div>
          </div>

          <FormCard title="Tokens / jour" hint={`Consommation sur les ${chartDays} derniers jours.`}>
            {hasChartData ? (
              <BarChart
                categories={dailySlice.map((row) => formatApiDateShort(row.date))}
                series={[{ name: 'Tokens', data: dailySlice.map((row) => row.tokens) }]}
              />
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aucune consommation IA sur cette période.
              </p>
            )}
          </FormCard>
        </>
      ) : null}

      {!loading && !usage && !error ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Aucune donnée de consommation.</p>
      ) : null}
    </div>
  )
}
