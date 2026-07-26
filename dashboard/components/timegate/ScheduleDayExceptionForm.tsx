'use client'

import { useEffect, useState } from 'react'
import { FormField, Input, SelectSearch, DateField, SwitcherField } from '@/components/ui/FormField'
import { findOption, toSelectOptions } from '@/lib/select-options'
import { listShiftTypes } from '@/lib/timegate/shift-types'
import type { ScheduleDayExceptionPayload } from '@/lib/timegate/schedule-day-exceptions'
import { HttpError } from '@/lib/http'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import type { SelectOption } from '@/components/ui/select-search-types'

type Props = {
  initial?: Partial<ScheduleDayExceptionPayload> & { isOff?: boolean }
  submitLabel: string
  onSubmit: (values: ScheduleDayExceptionPayload) => Promise<void>
  onCancel?: () => void
  lockShiftType?: boolean
}

export default function ScheduleDayExceptionForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  lockShiftType,
}: Props) {
  const [form, setForm] = useState({
    shiftTypeId: initial?.shiftTypeId ?? '',
    workDate: initial?.workDate ?? '',
    isOff: initial?.isOff ?? false,
    startTime: initial?.startTime ?? '08:00',
    endTime: initial?.endTime ?? '12:00',
    note: initial?.note ?? '',
  })
  const [shiftOptions, setShiftOptions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void listShiftTypes({ limit: 100 }).then((res) => {
      setShiftOptions(toSelectOptions(res.data))
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        shiftTypeId: form.shiftTypeId,
        workDate: form.workDate,
        isOff: form.isOff,
        ...(form.isOff ? {} : { startTime: form.startTime, endTime: form.endTime }),
        note: form.note.trim() || undefined,
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
        title="Exception de journée"
        hint="S’applique à tous les employés affectés à cet horaire pour la date choisie."
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
          <FormField label="Horaire *">
            <SelectSearch
              required
              instanceId="exception-shift"
              options={shiftOptions}
              value={findOption(shiftOptions, form.shiftTypeId)}
              onChange={(opt) => setForm((f) => ({ ...f, shiftTypeId: opt?.value ?? '' }))}
              isDisabled={lockShiftType}
            />
          </FormField>
          <FormField label="Date *">
            <DateField
              required
              value={form.workDate}
              onChange={(workDate) => setForm((f) => ({ ...f, workDate }))}
            />
          </FormField>
          <div className="md:col-span-2">
            <SwitcherField
              label="Jour non travaillé"
              checked={form.isOff}
              onCheckedChange={(isOff) => setForm((f) => ({ ...f, isOff }))}
              description="Si activé, personne sur cet horaire n’est prévu ce jour-là."
            />
          </div>
          {!form.isOff ? (
            <>
              <FormField label="Début *">
                <Input
                  required
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </FormField>
              <FormField label="Fin *">
                <Input
                  required
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </FormField>
            </>
          ) : null}
          <FormField label="Note">
            <Input
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Ex. veille de fête"
            />
          </FormField>
        </div>
      </FormCard>
    </form>
  )
}
