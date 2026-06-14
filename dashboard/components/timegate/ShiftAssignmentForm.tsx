'use client'

import { useEffect, useState } from 'react'
import { FormField, SelectSearch, DateField } from '@/components/ui/FormField'
import FormTabs from '@/components/ui/FormTabs'
import { normalizeApiDate, parseApiDate } from '@/lib/date-utils'
import { findOption, toSelectOptions } from '@/lib/select-options'
import { listEmployees } from '@/lib/timegate/employees'
import { listShiftTypes } from '@/lib/timegate/shift-types'
import type { ShiftAssignmentPayload } from '@/lib/timegate/shift-assignments'
import { HttpError } from '@/lib/http'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import type { SelectOption } from '@/components/ui/select-search-types'

type ShiftAssignmentFormProps = {
  initial?: Partial<ShiftAssignmentPayload>
  submitLabel: string
  onSubmit: (values: ShiftAssignmentPayload) => Promise<void>
  onCancel?: () => void
}

export default function ShiftAssignmentForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: ShiftAssignmentFormProps) {
  const [tab, setTab] = useState<'assignment' | 'period'>('assignment')
  const [form, setForm] = useState<ShiftAssignmentPayload>({
    employeeId: initial?.employeeId ?? '',
    shiftTypeId: initial?.shiftTypeId ?? '',
    startDate: normalizeApiDate(initial?.startDate),
    endDate: normalizeApiDate(initial?.endDate),
  })
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([])
  const [shiftOptions, setShiftOptions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void Promise.all([listEmployees({ limit: 100 }), listShiftTypes({ limit: 100 })]).then(
      ([employees, shifts]) => {
      setEmployeeOptions(
        toSelectOptions(
          employees.data.map((e) => ({
            id: e.id,
            name: `${e.firstName} ${e.lastName}`.trim(),
          })),
        ),
      )
      setShiftOptions(toSelectOptions(shifts.data))
    },
    )
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        ...form,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      })
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible.')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
      {
        id: 'assignment',
        label: 'Affectation',
        content: () => (
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Employé *">
              <SelectSearch
                required
                options={employeeOptions}
                value={findOption(employeeOptions, form.employeeId)}
                onChange={(opt) => setForm((f) => ({ ...f, employeeId: opt?.value ?? '' }))}
              />
            </FormField>
            <FormField label="Horaire *">
              <SelectSearch
                required
                options={shiftOptions}
                value={findOption(shiftOptions, form.shiftTypeId)}
                onChange={(opt) => setForm((f) => ({ ...f, shiftTypeId: opt?.value ?? '' }))}
              />
            </FormField>
          </div>
        ),
      },
      {
        id: 'period',
        label: 'Période',
        content: () => (
          <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
            <FormField label="Date début">
              <DateField
                value={form.startDate ?? ''}
                onChange={(startDate) => setForm((f) => ({ ...f, startDate }))}
              />
            </FormField>
            <FormField label="Date fin">
              <DateField
                value={form.endDate ?? ''}
                minDate={parseApiDate(form.startDate) ?? undefined}
                onChange={(endDate) => setForm((f) => ({ ...f, endDate }))}
              />
            </FormField>
          </div>
        ),
      },
    ]

  return (
    <form onSubmit={handleSubmit}>
      <FormCard
        title="Affectation horaire"
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
        <FormTabs tabs={tabs} activeTab={tab} onTabChange={(id) => setTab(id as 'assignment' | 'period')} />
      </FormCard>
    </form>
  )
}
