'use client'

import { useCallback, useEffect, useState } from 'react'
import { listEmployeeCheckins } from '@/lib/api'
import type { EmployeeCheckin } from '@/lib/types'
import { ErrorBanner, MobileCard } from '@/components/ui'

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function monthStartIsoDate() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10)
}

export default function CheckinsPage() {
  const [from, setFrom] = useState(monthStartIsoDate())
  const [to, setTo] = useState(todayIsoDate())
  const [rows, setRows] = useState<EmployeeCheckin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await listEmployeeCheckins({ from, to, limit: 100 })
      setRows(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="space-y-4">
      <MobileCard title="Mes pointages">
        <div className="mb-4 grid grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-text-muted">
            Du
            <input type="date" className="mt-1" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="text-xs font-semibold text-text-muted">
            Au
            <input type="date" className="mt-1" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>

        <ErrorBanner message={error} />

        {loading ? (
          <p className="text-sm text-text-muted">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-text-muted">Aucun pointage sur cette période.</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.id} className="border-t border-white/8 pt-3 text-sm first:border-0 first:pt-0">
                <p className="font-medium">
                  {row.type === 'CHECK_IN' ? 'Entrée' : 'Sortie'} —{' '}
                  {new Date(row.timestamp).toLocaleString('fr-FR')}
                </p>
                {row.kiosk?.name ? (
                  <p className="text-xs text-text-muted">{row.kiosk.name}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </MobileCard>
    </div>
  )
}
