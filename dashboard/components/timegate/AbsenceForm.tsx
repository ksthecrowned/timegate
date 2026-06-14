'use client'

import { useEffect, useState } from 'react'
import { FormField, Input, SelectSearch, SwitcherField, Textarea, DateField } from '@/components/ui/FormField'
import FormTabs from '@/components/ui/FormTabs'
import { normalizeApiDate } from '@/lib/date-utils'
import { findOption, toSelectOptions } from '@/lib/select-options'
import type { AbsencePayload } from '@/lib/timegate/absences'
import { listEmployees } from '@/lib/timegate/employees'
import { HttpError } from '@/lib/http'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import type { SelectOption } from '@/components/ui/select-search-types'

type AbsenceFormProps = {
  initial?: Partial<AbsencePayload>
  submitLabel: string
  onSubmit: (values: AbsencePayload) => Promise<void>
  onCancel?: () => void
}

export default function AbsenceForm({ initial, submitLabel, onSubmit, onCancel }: AbsenceFormProps) {
  const [tab, setTab] = useState<'absence' | 'justification'>('absence')
  const [form, setForm] = useState<AbsencePayload>({
    employeeId: initial?.employeeId ?? '',
    date: normalizeApiDate(initial?.date),
    justified: initial?.justified ?? false,
    reason: initial?.reason ?? '',
    justificationFileUrl: initial?.justificationFileUrl ?? '',
  })
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void listEmployees({ limit: 100 }).then((res) => {
      setEmployeeOptions(
        toSelectOptions(
          res.data.map((e) => ({
            id: e.id,
            name: `${e.firstName} ${e.lastName}`.trim(),
          })),
        ),
      )
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        ...form,
        reason: form.reason?.trim() || undefined,
        justificationFileUrl: form.justificationFileUrl?.trim() || undefined,
      })
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible.')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
      {
        id: 'absence',
        label: 'Absence',
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
            <FormField label="Date *">
              <DateField
                required
                value={form.date}
                onChange={(date) => setForm((f) => ({ ...f, date }))}
              />
            </FormField>
            <FormField label="Justifiée">
              <SwitcherField
                label="Absence justifiée"
                checked={!!form.justified}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, justified: checked }))}
              />
            </FormField>
          </div>
        ),
      },
      {
        id: 'justification',
        label: 'Justification',
        content: () => (
          <div className="max-w-2xl">
            <FormField label="Motif">
              <Textarea
                rows={3}
                value={form.reason ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </FormField>
            <FormField label="URL du justificatif">
              <Input
                type="url"
                value={form.justificationFileUrl ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, justificationFileUrl: e.target.value }))}
                placeholder="https://…"
              />
            </FormField>
          </div>
        ),
      },
    ]

  return (
    <form onSubmit={handleSubmit}>
      <FormCard
        title="Absence"
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
        <FormTabs tabs={tabs} activeTab={tab} onTabChange={(id) => setTab(id as 'absence' | 'justification')} />
      </FormCard>
    </form>
  )
}
