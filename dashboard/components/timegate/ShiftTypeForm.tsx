'use client'

import { useEffect, useState } from 'react'
import { FormField, Input, SelectSearch } from '@/components/ui/FormField'
import FormTabs from '@/components/ui/FormTabs'
import { findOption, toSelectOptions } from '@/lib/select-options'
import { listBranches } from '@/lib/timegate/branches'
import type { ShiftTypePayload } from '@/lib/timegate/shift-types'
import { HttpError } from '@/lib/http'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import type { SelectOption } from '@/components/ui/select-search-types'

type ShiftTypeFormProps = {
  initial?: Partial<ShiftTypePayload>
  submitLabel: string
  onSubmit: (values: ShiftTypePayload) => Promise<void>
  onCancel?: () => void
}

export default function ShiftTypeForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: ShiftTypeFormProps) {
  const [tab, setTab] = useState<'general' | 'schedule'>('general')
  const [form, setForm] = useState<ShiftTypePayload>({
    branchId: initial?.branchId ?? '',
    name: initial?.name ?? '',
    startTime: initial?.startTime?.slice(11, 16) ?? initial?.startTime ?? '08:00',
    endTime: initial?.endTime?.slice(11, 16) ?? initial?.endTime ?? '17:00',
    lateGraceMinutes: initial?.lateGraceMinutes ?? 15,
  })
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void listBranches({ limit: 100 }).then((res) => setBranchOptions(toSelectOptions(res.data)))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        ...form,
        name: form.name.trim(),
        lateGraceMinutes: form.lateGraceMinutes ?? undefined,
      })
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible.')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
      {
        id: 'general',
        label: 'Général',
        content: () => (
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Branche *">
              <SelectSearch
                required
                options={branchOptions}
                value={findOption(branchOptions, form.branchId)}
                onChange={(opt) => setForm((f) => ({ ...f, branchId: opt?.value ?? '' }))}
              />
            </FormField>
            <FormField label="Nom *">
              <Input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </FormField>
          </div>
        ),
      },
      {
        id: 'schedule',
        label: 'Horaires',
        content: () => (
          <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
            <FormField label="Heure début *">
              <Input
                required
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </FormField>
            <FormField label="Heure fin *">
              <Input
                required
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </FormField>
            <FormField label="Tolérance retard (min)">
              <Input
                type="number"
                min={0}
                value={form.lateGraceMinutes ?? 0}
                onChange={(e) =>
                  setForm((f) => ({ ...f, lateGraceMinutes: Number(e.target.value) || 0 }))
                }
              />
            </FormField>
          </div>
        ),
      },
    ]

  return (
    <form onSubmit={handleSubmit}>
      <FormCard
        title="Horaire"
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
        <FormTabs tabs={tabs} activeTab={tab} onTabChange={(id) => setTab(id as 'general' | 'schedule')} />
      </FormCard>
    </form>
  )
}
