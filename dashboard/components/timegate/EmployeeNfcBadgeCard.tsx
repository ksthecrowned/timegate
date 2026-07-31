'use client'

import { useEffect, useState } from 'react'
import { FormField, Input } from '@/components/ui/FormField'
import ConfirmModal from '@/components/ui/ConfirmModal'
import StatusBadge from '@/components/ui/StatusBadge'
import { setEmployeeNfcBadge } from '@/lib/timegate/employee-identity'
import { HttpError } from '@/lib/http'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from './ui'

type Props = {
  employeeId: string
  hasNfcBadge?: boolean
  nfcBadgeUid?: string | null
  onUpdated?: () => void
  bare?: boolean
}

export default function EmployeeNfcBadgeCard({
  employeeId,
  hasNfcBadge,
  nfcBadgeUid,
  onUpdated,
  bare = false,
}: Props) {
  const [uid, setUid] = useState(nfcBadgeUid ?? '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  useEffect(() => {
    setUid(nfcBadgeUid ?? '')
  }, [nfcBadgeUid])

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
      setConfirmRemove(false)
    }
  }

  return (
    <FormCard title="Carte NFC" bare={bare}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={hasNfcBadge ? 'Badge actif' : 'Sans badge'} />
        </div>
        <p className="text-sm text-gray-600 dark:text-neutral-400">
          Identifiant UID de la carte (hex, min. 4 caractères). Un badge ne peut être lié qu’à un
          seul employé.
        </p>
        <FormField label="UID badge">
          <Input
            value={uid}
            onChange={(e) => setUid(e.target.value.toUpperCase().replace(/[^0-9A-F:-\s]/g, ''))}
            placeholder="A1B2C3D4"
          />
        </FormField>
        <ApiErrorBanner message={error} />
        {message ? (
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-700 dark:border-teal-800 dark:bg-teal-900/20 dark:text-teal-400">
            {message}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving || uid.replace(/[\s:-]/g, '').length < 4}
            onClick={() => void save(uid)}
            className={primaryBtnClass}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer UID'}
          </button>
          {hasNfcBadge ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => setConfirmRemove(true)}
              className={secondaryBtnClass}
            >
              Retirer le badge
            </button>
          ) : null}
        </div>
      </div>

      <ConfirmModal
        open={confirmRemove}
        title="Retirer le badge NFC ?"
        message="L’employé ne pourra plus pointer avec cette carte jusqu’à ce qu’un nouvel UID soit enregistré."
        confirmLabel="Retirer"
        cancelLabel="Annuler"
        danger
        onConfirm={() => void save(null)}
        onCancel={() => setConfirmRemove(false)}
      />
    </FormCard>
  )
}
