'use client'

import { useState } from 'react'
import { FormField, Input } from '@/components/ui/FormField'
import type { CountryPayload } from '@/lib/timegate/countries'
import { HttpError } from '@/lib/http'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'

type CountryFormProps = {
  initial?: Partial<CountryPayload>
  submitLabel: string
  onSubmit: (values: CountryPayload) => Promise<void>
  onCancel?: () => void
}

export default function CountryForm({ initial, submitLabel, onSubmit, onCancel }: CountryFormProps) {
  const [form, setForm] = useState<CountryPayload>({
    name: initial?.name ?? '',
    isoCode: initial?.isoCode ?? '',
    phoneCode: initial?.phoneCode ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        name: form.name.trim(),
        isoCode: form.isoCode.trim().toUpperCase(),
        phoneCode: form.phoneCode?.trim() || undefined,
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
        title="Pays"
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
        <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
          <FormField label="Nom" required>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="République du Congo"
              required
            />
          </FormField>
          <FormField label="Code ISO" required>
            <Input
              value={form.isoCode}
              onChange={(e) => setForm((f) => ({ ...f, isoCode: e.target.value.toUpperCase() }))}
              placeholder="CG"
              maxLength={10}
              required
            />
          </FormField>
          <FormField label="Indicatif téléphonique">
            <Input
              value={form.phoneCode ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, phoneCode: e.target.value }))}
              placeholder="+242"
            />
          </FormField>
        </div>
      </FormCard>
    </form>
  )
}
