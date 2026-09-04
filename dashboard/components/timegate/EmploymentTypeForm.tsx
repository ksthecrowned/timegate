'use client'

import { useState } from 'react'
import { FormField, Input, SwitcherField } from '@/components/ui/FormField'
import { SelectSearch } from '@/components/ui/SelectSearch'
import type { SelectOption } from '@/components/ui/select-search-types'
import { findOption } from '@/lib/select-options'
import { HttpError } from '@/lib/http'
import type { EmploymentPayMode, EmploymentType } from '@/lib/timegate/types'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'

export type EmploymentTypeFormValues = {
  name: string
  includeInPayroll: boolean
  accruesLeave: boolean
  payMode: EmploymentPayMode
}

const PAY_MODE_OPTIONS: SelectOption[] = [
  { value: 'MONTHLY', label: 'Mensuel (prorata jours)' },
  { value: 'FLAT', label: 'Forfait (indemnité fixe)' },
]

type Props = {
  title: string
  submitLabel: string
  initial?: Partial<EmploymentType>
  onSubmit: (values: EmploymentTypeFormValues) => Promise<void>
  onCancel?: () => void
}

export default function EmploymentTypeForm({
  title,
  submitLabel,
  initial,
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [includeInPayroll, setIncludeInPayroll] = useState(initial?.includeInPayroll ?? true)
  const [accruesLeave, setAccruesLeave] = useState(initial?.accruesLeave ?? true)
  const [payMode, setPayMode] = useState<EmploymentPayMode>(initial?.payMode ?? 'MONTHLY')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        name: name.trim(),
        includeInPayroll,
        accruesLeave,
        payMode,
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
        title={title}
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
        <FormField label="Nom *">
          <Input required value={name} onChange={(e) => setName(e.target.value)} />
        </FormField>
        <FormField label="Mode de paie">
          <SelectSearch
            instanceId="employment-type-pay-mode"
            options={PAY_MODE_OPTIONS}
            value={findOption(PAY_MODE_OPTIONS, payMode) ?? PAY_MODE_OPTIONS[0]}
            onChange={(opt) => setPayMode((opt?.value as EmploymentPayMode) ?? 'MONTHLY')}
          />
        </FormField>
        <SwitcherField
          label="Inclure dans les cycles de paie"
          checked={includeInPayroll}
          onCheckedChange={setIncludeInPayroll}
        />
        <SwitcherField
          label="Acquiert des congés payés"
          checked={accruesLeave}
          onCheckedChange={setAccruesLeave}
        />
      </FormCard>
    </form>
  )
}
