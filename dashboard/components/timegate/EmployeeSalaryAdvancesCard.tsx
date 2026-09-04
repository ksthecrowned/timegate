'use client'

import { useCallback, useEffect, useState } from 'react'
import { ApiErrorBanner, DetailCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import { FormField, Input, NumberInput } from '@/components/ui/FormField'
import StatusBadge from '@/components/ui/StatusBadge'
import { formatApiDate } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'
import { formatMoney } from '@/lib/money'
import {
  cancelSalaryAdvance,
  createSalaryAdvance,
  disburseSalaryAdvance,
  listSalaryAdvances,
  SALARY_ADVANCE_STATUS_LABELS,
} from '@/lib/timegate/salary-advances'
import type { SalaryAdvance } from '@/lib/timegate/types'

export default function EmployeeSalaryAdvancesCard({
  employeeId,
  bare = false,
}: {
  employeeId: string
  bare?: boolean
}) {
  const [items, setItems] = useState<SalaryAdvance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [amount, setAmount] = useState(0)
  const [notes, setNotes] = useState('')
  const [disbursed, setDisbursed] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await listSalaryAdvances(employeeId))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Impossible de charger les avances.')
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await createSalaryAdvance(employeeId, {
        amount,
        notes: notes.trim() || undefined,
        disbursed,
      })
      setShowCreate(false)
      setAmount(0)
      setNotes('')
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Création impossible.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDisburse(id: string) {
    setError('')
    try {
      await disburseSalaryAdvance(employeeId, id)
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Versement impossible.')
    }
  }

  async function handleCancel(id: string) {
    if (!window.confirm('Annuler cette avance ?')) return
    setError('')
    try {
      await cancelSalaryAdvance(employeeId, id)
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Annulation impossible.')
    }
  }

  return (
    <DetailCard
      bare={bare}
      title="Avances sur salaire"
      actions={
        <button
          type="button"
          className={primaryBtnClass}
          onClick={() => setShowCreate((v) => !v)}
        >
          {showCreate ? 'Fermer' : 'Ajouter'}
        </button>
      }
    >
      <div className={bare ? 'pt-1' : 'px-4 pt-4 md:px-5'}>
        <ApiErrorBanner message={error} />
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          Une avance versée est retenue automatiquement sur le prochain cycle de paie (brouillon /
          recalcul).
        </p>
      </div>

      {showCreate ? (
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-3 px-4 pb-4 md:px-5">
          <FormField label="Montant *">
            <NumberInput required min={1} value={amount} onChange={setAmount} />
          </FormField>
          <FormField label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={disbursed}
              onChange={(e) => setDisbursed(e.target.checked)}
              className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            Marquer comme déjà versée
          </label>
          <div className="flex gap-2">
            <button type="button" className={secondaryBtnClass} onClick={() => setShowCreate(false)}>
              Annuler
            </button>
            <button type="submit" disabled={saving || amount <= 0} className={primaryBtnClass}>
              {saving ? 'Enregistrement…' : 'Créer'}
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-x-auto px-4 pb-4 md:px-5">
        {loading ? (
          <p className="py-4 text-sm text-slate-500">Chargement…</p>
        ) : items.length === 0 ? (
          <p className="py-4 text-sm text-slate-500">Aucune avance.</p>
        ) : (
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left dark:border-slate-700">
                <th className="py-2 pr-3 font-semibold">Montant</th>
                <th className="py-2 pr-3 font-semibold">Statut</th>
                <th className="py-2 pr-3 font-semibold">Versée</th>
                <th className="py-2 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 pr-3 tabular-nums">{formatMoney(row.amount)}</td>
                  <td className="py-2 pr-3">
                    <StatusBadge status={SALARY_ADVANCE_STATUS_LABELS[row.status]} />
                  </td>
                  <td className="py-2 pr-3 text-slate-600 dark:text-slate-300">
                    {formatApiDate(row.paidAt)}
                  </td>
                  <td className="py-2 text-right">
                    <div className="inline-flex gap-2">
                      {row.status === 'PENDING' ? (
                        <button
                          type="button"
                          className="text-sm text-primary hover:underline"
                          onClick={() => void handleDisburse(row.id)}
                        >
                          Verser
                        </button>
                      ) : null}
                      {row.status === 'PENDING' || row.status === 'DISBURSED' ? (
                        <button
                          type="button"
                          className="text-sm text-red-600 hover:underline dark:text-red-400"
                          onClick={() => void handleCancel(row.id)}
                        >
                          Annuler
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </DetailCard>
  )
}
