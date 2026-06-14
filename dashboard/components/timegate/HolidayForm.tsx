'use client'

import { useState } from 'react'
import { FormField, Input, DateField } from '@/components/ui/FormField'
import type { HolidayPayload } from '@/lib/timegate/holidays'
import { normalizeApiDate } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import { useCompanyId } from '@/components/timegate/hooks'

type HolidayFormProps = {
  initial?: Partial<Omit<HolidayPayload, 'companyId'>>
  submitLabel: string
  onSubmit: (values: HolidayPayload) => Promise<void>
  onCancel?: () => void
}

export default function HolidayForm({ initial, submitLabel, onSubmit, onCancel }: HolidayFormProps) {
  const companyId = useCompanyId()
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    date: normalizeApiDate(initial?.date),
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId) {
      setError('Organisation introuvable.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onSubmit({ companyId, name: form.name.trim(), date: form.date })
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormCard
        title="Jour férié"
        footer={
          <>
            {onCancel && (
              <button type="button" onClick={onCancel} className={secondaryBtnClass}>
                Annuler
              </button>
            )}
            <button type="submit" disabled={loading || !companyId} className={primaryBtnClass}>
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
          <FormField label="Date *">
            <DateField
              required
              value={form.date}
              onChange={(date) => setForm((f) => ({ ...f, date }))}
            />
          </FormField>
        </div>
      </FormCard>
    </form>
  )
}
