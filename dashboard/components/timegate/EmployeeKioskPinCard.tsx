'use client'

import { useState } from 'react'
import { FormField, Input } from '@/components/ui/FormField'
import { setEmployeeKioskPin } from '@/lib/timegate/shift-swaps'
import { HttpError } from '@/lib/http'

type Props = {
  employeeId: string
  hasKioskPin?: boolean
  onUpdated?: () => void
}

export default function EmployeeKioskPinCard({ employeeId, hasKioskPin, onUpdated }: Props) {
  const [pin, setPin] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save(nextPin?: string) {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await setEmployeeKioskPin(employeeId, nextPin)
      setMessage(nextPin ? 'PIN kiosk enregistré.' : 'PIN kiosk supprimé.')
      setPin('')
      onUpdated?.()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl border p-4 space-y-3 dark:border-neutral-700">
      <h3 className="font-semibold">PIN kiosk (fallback)</h3>
      <p className="text-sm text-gray-500 dark:text-neutral-400">
        Code numérique 4–6 chiffres pour pointage sur borne si la reconnaissance faciale échoue.
        {hasKioskPin ? ' Un PIN est déjà configuré.' : ' Aucun PIN configuré.'}
      </p>
      <FormField label="Nouveau PIN">
        <Input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="1234"
          inputMode="numeric"
        />
      </FormField>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving || pin.length < 4}
          onClick={() => void save(pin)}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Enregistrer PIN
        </button>
        {hasKioskPin ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void save('')}
            className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-700"
          >
            Supprimer PIN
          </button>
        ) : null}
      </div>
    </div>
  )
}
