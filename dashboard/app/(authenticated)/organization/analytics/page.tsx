'use client'

import PageHeader from '@/components/ui/PageHeader'
import { HttpError } from '@/lib/http'
import {
  getAnalyticsFunnel,
  type AnalyticsFunnelResponse,
} from '@/lib/timegate/analytics'
import { useEffect, useState } from 'react'

const EVENT_LABELS: Record<string, string> = {
  'employee.login_success': 'Connexions',
  'employee.qr_punch_success': 'Pointages QR',
  'employee.leave_request_submitted': 'Demandes de congé',
}

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

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Organisation', href: '/organization' },
          { label: 'Analytics produit' },
        ]}
      />

      <div className="flex gap-2">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              days === d
                ? 'bg-primary text-white'
                : 'border border-slate-200 text-slate-600 dark:border-neutral-700 dark:text-slate-300'
            }`}
          >
            {d} j
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">Chargement…</p> : null}

      {data ? (
        <>
          <div className="tg-card shadow-2xs grid gap-4 p-5 sm:grid-cols-3">
            {Object.entries(EVENT_LABELS).map(([key, label]) => {
              const stats = data.events[key]
              return (
                <div key={key}>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {(stats?.total ?? 0).toLocaleString('fr-FR')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {(stats?.uniqueUsers ?? 0).toLocaleString('fr-FR')} utilisateurs uniques
                  </p>
                </div>
              )
            })}
          </div>

          <div className="tg-card shadow-2xs grid gap-4 p-5 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Login → QR</p>
              <p className="mt-1 text-2xl font-semibold">{pct(data.conversion.loginToQr)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">Login → Congé</p>
              <p className="mt-1 text-2xl font-semibold">{pct(data.conversion.loginToLeave)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">QR → Congé</p>
              <p className="mt-1 text-2xl font-semibold">{pct(data.conversion.qrToLeave)}</p>
            </div>
          </div>

          {data.daily.some((d) => d.login + d.qr + d.leave > 0) ? (
            <div className="tg-card shadow-2xs p-5">
              <h2 className="mb-3 text-sm font-semibold">Activité quotidienne</h2>
              <ul className="space-y-1 text-sm">
                {data.daily
                  .filter((d) => d.login + d.qr + d.leave > 0)
                  .slice(-14)
                  .map((row) => (
                    <li
                      key={row.date}
                      className="flex justify-between gap-4 text-slate-600 dark:text-slate-300"
                    >
                      <span>{row.date}</span>
                      <span className="tabular-nums">
                        {row.login} login · {row.qr} QR · {row.leave} congé
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Aucun événement sur la période. Les compteurs se rempliront après connexions / QR /
              demandes depuis l’app employé.
            </p>
          )}
        </>
      ) : null}
    </div>
  )
}
