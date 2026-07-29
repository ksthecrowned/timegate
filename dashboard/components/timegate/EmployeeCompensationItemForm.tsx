'use client'

import { useState } from 'react'
import { DateField, FormField, Input, NumberInput, SelectSearch } from '@/components/ui/FormField'
import type { SelectOption } from '@/components/ui/select-search-types'
import { findOption } from '@/lib/select-options'
import type {
  CompensationItemKind,
  EmployeeCompensationItemPayload,
} from '@/lib/timegate/employee-compensation'
import { HttpError } from '@/lib/http'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'

const KIND_OPTIONS: SelectOption[] = [
  { value: 'ALLOWANCE', label: 'Indemnité' },
  { value: 'DEDUCTION', label: 'Retenue' },
]

type Props = {
  initial?: Partial<EmployeeCompensationItemPayload>
  submitLabel: string
  onSubmit: (values: EmployeeCompensationItemPayload) => Promise<void>
  onCancel?: () => void
}

export default function EmployeeCompensationItemForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState({
    label: initial?.label ?? '',
    kind: initial?.kind ?? ('ALLOWANCE' as CompensationItemKind),
    amount: initial?.amount ?? 0,
    effectiveFrom: initial?.effectiveFrom ?? '',
    effectiveTo: initial?.effectiveTo ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        label: form.label.trim(),
        kind: form.kind,
        amount: form.amount,
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo || undefined,
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
        title="Élément de rémunération"
        hint="Indemnité ou retenue récurrente appliquée à la paie de cet employé."
        footer={
          <>
            {onCancel ? (
              <button type="button" onClick={onCancel} className={secondaryBtnClass}>
                Annuler
              </button>
            ) : null}
            <button type="submit" disabled={loading} className={primaryBtnClass}>
              {loading ? 'Enregistrement…' : submitLabel}
            </button>
          </>
        }
      >
        <ApiErrorBanner message={error} />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Libellé *">
            <Input
              required
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Ex. Prime de transport"
            />
          </FormField>
          <FormField label="Type *">
            <SelectSearch
              instanceId="compensation-item-kind"
              options={KIND_OPTIONS}
              value={findOption(KIND_OPTIONS, form.kind)}
              onChange={(opt) =>
                setForm((f) => ({
                  ...f,
                  kind: (opt?.value as CompensationItemKind) ?? 'ALLOWANCE',
                }))
              }
            />
          </FormField>
          <FormField label="Montant *">
            <NumberInput
              required
              min={0}
              step="0.01"
              value={form.amount}
              onChange={(amount) => setForm((f) => ({ ...f, amount }))}
            />
          </FormField>
          <div />
          <FormField label="Depuis *">
            <DateField
              required
              value={form.effectiveFrom}
              onChange={(effectiveFrom) => setForm((f) => ({ ...f, effectiveFrom }))}
            />
          </FormField>
          <FormField label="Jusqu'au">
            <DateField
              value={form.effectiveTo}
              onChange={(effectiveTo) => setForm((f) => ({ ...f, effectiveTo }))}
            />
          </FormField>
        </div>
      </FormCard>
    </form>
  )
}
