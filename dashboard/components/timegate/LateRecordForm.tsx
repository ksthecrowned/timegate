'use client'

import { useEffect, useState } from 'react'
import { FormField, Input, SelectSearch, SwitcherField, Textarea, DateField } from '@/components/ui/FormField'
import FormTabs from '@/components/ui/FormTabs'
import { normalizeApiDate } from '@/lib/date-utils'
import { findOption, toSelectOptions } from '@/lib/select-options'
import { listEmployees } from '@/lib/timegate/employees'
import type { LateRecordPayload } from '@/lib/timegate/late-records'
import { HttpError } from '@/lib/http'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import type { SelectOption } from '@/components/ui/select-search-types'

type LateRecordFormProps = {
  initial?: Partial<LateRecordPayload>
  submitLabel: string
  onSubmit: (values: LateRecordPayload) => Promise<void>
  onCancel?: () => void
}

export default function LateRecordForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: LateRecordFormProps) {
  const [tab, setTab] = useState<'record' | 'justification'>('record')
  const [form, setForm] = useState<LateRecordPayload>({
    employeeId: initial?.employeeId ?? '',
    date: normalizeApiDate(initial?.date),
    latenessMinutes: initial?.latenessMinutes ?? 0,
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
        id: 'record',
        label: 'Retard',
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
            <FormField label="Minutes de retard *">
              <Input
                required
                type="number"
                min={0}
                value={form.latenessMinutes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, latenessMinutes: Number(e.target.value) || 0 }))
                }
              />
            </FormField>
            <FormField label="Justifié">
              <SwitcherField
                label="Retard justifié"
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
        title="Retard"
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
        <FormTabs tabs={tabs} activeTab={tab} onTabChange={(id) => setTab(id as 'record' | 'justification')} />
      </FormCard>
    </form>
  )
}
