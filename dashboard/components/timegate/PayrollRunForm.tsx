'use client'

import { useState } from 'react'
import { FormField, Input } from '@/components/ui/FormField'
import type { PayrollRunPayload } from '@/lib/timegate/payroll-runs'
import { HttpError } from '@/lib/http'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'

type PayrollRunFormProps = {
  submitLabel: string
  onSubmit: (values: PayrollRunPayload) => Promise<void>
  onCancel?: () => void
}

export default function PayrollRunForm({ submitLabel, onSubmit, onCancel }: PayrollRunFormProps) {
  const now = new Date()
  const [form, setForm] = useState<PayrollRunPayload>({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Création impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormCard
        title="Nouvelle paie"
        footer={
          <>
            {onCancel && (
              <button type="button" onClick={onCancel} className={secondaryBtnClass}>
                Annuler
              </button>
            )}
            <button type="submit" disabled={loading} className={primaryBtnClass}>
              {loading ? 'Création…' : submitLabel}
            </button>
          </>
        }
      >
        <ApiErrorBanner message={error} />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Année *">
            <Input
              required
              type="number"
              min={2000}
              value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
            />
          </FormField>
          <FormField label="Mois *">
            <Input
              required
              type="number"
              min={1}
              max={12}
              value={form.month}
              onChange={(e) => setForm((f) => ({ ...f, month: Number(e.target.value) }))}
            />
          </FormField>
        </div>
      </FormCard>
    </form>
  )
}
