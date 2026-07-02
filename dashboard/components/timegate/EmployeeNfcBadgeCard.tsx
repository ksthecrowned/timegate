'use client'

import { useState } from 'react'
import { FormField, Input } from '@/components/ui/FormField'
import { setEmployeeNfcBadge } from '@/lib/timegate/employee-identity'
import { HttpError } from '@/lib/http'
import { DetailCard } from './ui'

type Props = {
  employeeId: string
  hasNfcBadge?: boolean
  nfcBadgeUid?: string | null
  onUpdated?: () => void
}

export default function EmployeeNfcBadgeCard({
  employeeId,
  hasNfcBadge,
  nfcBadgeUid,
  onUpdated,
}: Props) {
  const [uid, setUid] = useState(nfcBadgeUid ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function save(nextUid?: string | null) {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      await setEmployeeNfcBadge(employeeId, nextUid)
      setMessage(nextUid ? 'Badge NFC enregistré.' : 'Badge NFC retiré.')
      if (nextUid === null || nextUid === undefined) setUid('')
      onUpdated?.()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <DetailCard title="Carte NFC">
      <div className="px-5 py-4 flex flex-col gap-4">
        <p className="text-sm text-gray-500 dark:text-neutral-400">
          Identifiant UID de la carte (hex, min. 4 caractères). Un badge ne peut être lié qu’à un
          seul employé.
          {hasNfcBadge ? ' Badge actif.' : ' Aucun badge configuré.'}
        </p>
        <FormField label="UID badge">
          <Input
            value={uid}
            onChange={(e) => setUid(e.target.value.toUpperCase().replace(/[^0-9A-F:-\s]/g, ''))}
            placeholder="A1B2C3D4"
          />
        </FormField>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving || uid.replace(/[\s:-]/g, '').length < 4}
            onClick={() => void save(uid)}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Enregistrer UID
          </button>
          {hasNfcBadge ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void save(null)}
              className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-700"
            >
              Retirer le badge
            </button>
          ) : null}
        </div>
      </div>
    </DetailCard>
  )
}
