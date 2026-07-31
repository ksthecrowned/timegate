'use client'

import { useState } from 'react'
import { FormField, Input, SwitcherField } from '@/components/ui/FormField'
import type { LeaveTypePayload } from '@/lib/timegate/leave-types'
import { HttpError } from '@/lib/http'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'

type LeaveTypeFormProps = {
  initial?: Partial<LeaveTypePayload>
  submitLabel: string
  onSubmit: (values: LeaveTypePayload) => Promise<void>
  onCancel?: () => void
}

export default function LeaveTypeForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: LeaveTypeFormProps) {
  const [form, setForm] = useState<LeaveTypePayload>({
    name: initial?.name ?? '',
    isLwp: initial?.isLwp ?? false,
    isCarryForward: initial?.isCarryForward ?? false,
    maxDaysPerYear: initial?.maxDaysPerYear ?? null,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSubmit({ ...form, name: form.name.trim() })
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormCard
        title="Type de congé"
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
        <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
          <FormField label="Nom *">
            <Input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </FormField>
          <FormField label="Sans solde">
            <SwitcherField
              label="Congé sans solde"
              checked={!!form.isLwp}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, isLwp: checked }))}
            />
          </FormField>
          <FormField label="Report">
            <SwitcherField
              label="Reportable"
              checked={!!form.isCarryForward}
              onCheckedChange={(checked) => setForm((f) => ({ ...f, isCarryForward: checked }))}
            />
          </FormField>
          <FormField label="Jours alloués / an">
            <Input
              type="number"
              min={0}
              max={366}
              placeholder="Illimité si vide"
              value={form.maxDaysPerYear ?? ''}
              onChange={(e) => {
                const raw = e.target.value.trim()
                setForm((f) => ({
                  ...f,
                  maxDaysPerYear: raw === '' ? null : Number(raw),
                }))
              }}
            />
          </FormField>
        </div>
      </FormCard>
    </form>
  )
}
