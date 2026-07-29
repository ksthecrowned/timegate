'use client'

import { useState } from 'react'
import { FormField, Input, NumberInput, SelectSearch, Textarea } from '@/components/ui/FormField'
import type { SelectOption } from '@/components/ui/select-search-types'
import { findOption } from '@/lib/select-options'
import type { CompensationItemKind } from '@/lib/timegate/employee-compensation'
import type { PayrollVariableItemPayload } from '@/lib/timegate/payroll-variable-items'
import { HttpError } from '@/lib/http'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'

const KIND_OPTIONS: SelectOption[] = [
  { value: 'ALLOWANCE', label: 'Indemnité' },
  { value: 'DEDUCTION', label: 'Retenue' },
]

type Props = {
  employeeOptions: SelectOption[]
  submitLabel: string
  onSubmit: (values: PayrollVariableItemPayload) => Promise<void>
  onCancel?: () => void
}

export default function PayrollVariableItemForm({
  employeeOptions,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState({
    employeeId: '',
    label: '',
    kind: 'ALLOWANCE' as CompensationItemKind,
    amount: 0,
    notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        employeeId: form.employeeId,
        label: form.label.trim(),
        kind: form.kind,
        amount: form.amount,
        notes: form.notes.trim() || undefined,
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
        title="Élément variable"
        hint="Indemnité ou retenue ponctuelle appliquée uniquement à cette paie."
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
          <FormField label="Employé *">
            <SelectSearch
              required
              instanceId="payroll-variable-item-employee"
              options={employeeOptions}
              value={findOption(employeeOptions, form.employeeId)}
              onChange={(opt) => setForm((f) => ({ ...f, employeeId: opt?.value ?? '' }))}
            />
          </FormField>
          <FormField label="Libellé *">
            <Input
              required
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="Ex. Prime exceptionnelle"
            />
          </FormField>
          <FormField label="Type *">
            <SelectSearch
              instanceId="payroll-variable-item-kind"
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
          <div className="md:col-span-2">
            <FormField label="Notes">
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Précisions optionnelles…"
              />
            </FormField>
          </div>
        </div>
      </FormCard>
    </form>
  )
}
