'use client'

import { useEffect, useState } from 'react'
import { FormField, Input, SelectSearch } from '@/components/ui/FormField'
import { findOption, toSelectOptions } from '@/lib/select-options'
import { listShiftTypes } from '@/lib/timegate/shift-types'
import type { WorkDayPayload } from '@/lib/timegate/work-days'
import { WEEK_DAY_OPTIONS } from '@/lib/timegate/work-days'
import { HttpError } from '@/lib/http'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import type { SelectOption } from '@/components/ui/select-search-types'

type WorkDayFormProps = {
  initial?: Partial<WorkDayPayload>
  submitLabel: string
  onSubmit: (values: WorkDayPayload) => Promise<void>
  onCancel?: () => void
}

export default function WorkDayForm({ initial, submitLabel, onSubmit, onCancel }: WorkDayFormProps) {
  const [form, setForm] = useState<WorkDayPayload>({
    scheduleId: initial?.scheduleId ?? '',
    day: initial?.day ?? 'MONDAY',
    startTime: initial?.startTime ?? '08:00',
    endTime: initial?.endTime ?? '17:00',
  })
  const [shiftOptions, setShiftOptions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void listShiftTypes({ limit: 100 }).then((res) => setShiftOptions(toSelectOptions(res.data)))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSubmit(form)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormCard
        title="Jour ouvré"
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
          <FormField label="Horaire *">
            <SelectSearch
              required
              options={shiftOptions}
              value={findOption(shiftOptions, form.scheduleId)}
              onChange={(opt) => setForm((f) => ({ ...f, scheduleId: opt?.value ?? '' }))}
            />
          </FormField>
          <FormField label="Jour *">
            <SelectSearch
              required
              options={WEEK_DAY_OPTIONS}
              value={findOption(WEEK_DAY_OPTIONS, form.day)}
              onChange={(opt) =>
                setForm((f) => ({
                  ...f,
                  day: (opt?.value as WorkDayPayload['day']) ?? 'MONDAY',
                }))
              }
            />
          </FormField>
          <FormField label="Heure début *">
            <Input
              required
              value={form.startTime}
              onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              placeholder="08:00"
            />
          </FormField>
          <FormField label="Heure fin *">
            <Input
              required
              value={form.endTime}
              onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              placeholder="17:00"
            />
          </FormField>
        </div>
      </FormCard>
    </form>
  )
}
