'use client'

import PageHeader from '@/components/ui/PageHeader'
import { getAiUsage, getAiUsageHistory, type AiUsageSummary } from '@/lib/timegate/copilot'
import { useEffect, useState } from 'react'

export default function AiUsagePage() {
  const [usage, setUsage] = useState<AiUsageSummary | null>(null)
  const [history, setHistory] = useState<{ daily: Array<{ date: string; tokens: number }>; sessions: number } | null>(
    null,
  )

  useEffect(() => {
    void Promise.all([getAiUsage(), getAiUsageHistory()])
      .then(([usageData, historyData]) => {
        setUsage(usageData)
        setHistory(historyData)
      })
      .catch(() => undefined)
  }, [])

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Organisation', href: '#' },
          { label: 'Consommation IA' },
        ]}
      />

      <p className="text-sm text-gray-500 dark:text-neutral-400">
        Suivi du copilote manager et du quota mensuel de tokens.
      </p>

      {usage && (
        <div className="tg-card shadow-2xs p-5 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Tokens utilisés (mois)</p>
            <p className="mt-1 text-2xl font-semibold">{usage.usedTokens.toLocaleString('fr-FR')}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Quota mensuel</p>
            <p className="mt-1 text-2xl font-semibold">
              {usage.unlimited || usage.quotaTokens == null
                ? 'Illimité'
                : usage.quotaTokens.toLocaleString('fr-FR')}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Sessions (30 j)</p>
            <p className="mt-1 text-2xl font-semibold">{history?.sessions ?? '—'}</p>
          </div>
        </div>
      )}

      {history && history.daily.length > 0 && (
        <div className="tg-card shadow-2xs p-5">
          <h2 className="text-sm font-semibold mb-3">Tokens / jour (30 derniers jours)</h2>
          <ul className="space-y-1 text-sm">
            {history.daily.slice(-14).map((row) => (
              <li key={row.date} className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>{row.date}</span>
                <span>{row.tokens.toLocaleString('fr-FR')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
