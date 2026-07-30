'use client'

import { useState } from 'react'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import { FormField, Input, NumberInput } from '@/components/ui/FormField'
import { HttpError } from '@/lib/http'
import type { PayGroupPayload } from '@/lib/timegate/pay-groups'

type PayGroupFormProps = {
  initial?: Partial<PayGroupPayload>
  submitLabel: string
  onSubmit: (values: PayGroupPayload) => Promise<void>
  onCancel?: () => void
}

export default function PayGroupForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: PayGroupFormProps) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    payDayOfMonth: initial?.payDayOfMonth ?? 1,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Le nom est obligatoire.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        name: form.name.trim(),
        payDayOfMonth: form.payDayOfMonth,
      })
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormCard
        title="Groupe de paie"
        footer={
          <>
            {onCancel && (
              <button type="button" onClick={onCancel} className={secondaryBtnClass}>
                Annuler
              </button>
            )}
            <button type="submit" disabled={loading} className={primaryBtnClass}>
              {loading ? 'Enregistrement…' : submitLabel}
            </button>
          </>
        }
      >
        <ApiErrorBanner message={error} />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Nom *">
            <Input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </FormField>
          <FormField label="Jour d'échéance de paie *" hint="Jour du mois (1-28)">
            <NumberInput
              required
              min={1}
              max={28}
              step={1}
              value={form.payDayOfMonth}
              onChange={(value) => setForm((f) => ({ ...f, payDayOfMonth: value }))}
            />
          </FormField>
        </div>
      </FormCard>
    </form>
  )
}
