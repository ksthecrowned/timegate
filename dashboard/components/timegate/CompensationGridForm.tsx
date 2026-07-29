'use client'

import { useEffect, useState } from 'react'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import { DateField, FormField, NumberInput, SelectSearch } from '@/components/ui/FormField'
import type { SelectOption } from '@/components/ui/select-search-types'
import { normalizeApiDate } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'
import { findOption, toSelectOptions } from '@/lib/select-options'
import type { CompensationGridPayload } from '@/lib/timegate/compensation-grid'
import { listDesignations, listEmploymentTypes } from '@/lib/timegate/refs'

type CompensationGridFormProps = {
  initial?: Partial<CompensationGridPayload>
  submitLabel: string
  onSubmit: (values: CompensationGridPayload) => Promise<void>
  onCancel?: () => void
}

export default function CompensationGridForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: CompensationGridFormProps) {
  const [form, setForm] = useState({
    designationId: initial?.designationId ?? '',
    employmentTypeId: initial?.employmentTypeId ?? '',
    baseSalary: initial?.baseSalary ?? 0,
    effectiveFrom: normalizeApiDate(initial?.effectiveFrom),
    effectiveTo: normalizeApiDate(initial?.effectiveTo),
  })
  const [designationOptions, setDesignationOptions] = useState<SelectOption[]>([])
  const [employmentTypeOptions, setEmploymentTypeOptions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void Promise.all([listDesignations(), listEmploymentTypes()]).then(
      ([designations, employmentTypes]) => {
        setDesignationOptions(toSelectOptions(designations.data))
        setEmploymentTypeOptions(toSelectOptions(employmentTypes.data))
      },
    )
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.designationId || !form.employmentTypeId) {
      setError('Sélectionnez un poste et un type de contrat.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        designationId: form.designationId,
        employmentTypeId: form.employmentTypeId,
        baseSalary: form.baseSalary,
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
        title="Grille de rémunération"
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
          <FormField label="Poste *">
            <SelectSearch
              instanceId="compensation-grid-designation"
              options={designationOptions}
              value={findOption(designationOptions, form.designationId)}
              onChange={(opt) => setForm((f) => ({ ...f, designationId: opt?.value ?? '' }))}
            />
          </FormField>
          <FormField label="Type de contrat *">
            <SelectSearch
              instanceId="compensation-grid-employment-type"
              options={employmentTypeOptions}
              value={findOption(employmentTypeOptions, form.employmentTypeId)}
              onChange={(opt) => setForm((f) => ({ ...f, employmentTypeId: opt?.value ?? '' }))}
            />
          </FormField>
          <FormField label="Salaire de base *">
            <NumberInput
              required
              min={0}
              step="0.01"
              value={form.baseSalary}
              onChange={(value) => setForm((f) => ({ ...f, baseSalary: value }))}
            />
          </FormField>
          <div />
          <FormField label="Effectif depuis *">
            <DateField
              required
              value={form.effectiveFrom}
              onChange={(date) => setForm((f) => ({ ...f, effectiveFrom: date }))}
            />
          </FormField>
          <FormField label="Effectif jusqu'au">
            <DateField
              value={form.effectiveTo}
              onChange={(date) => setForm((f) => ({ ...f, effectiveTo: date }))}
            />
          </FormField>
        </div>
      </FormCard>
    </form>
  )
}
