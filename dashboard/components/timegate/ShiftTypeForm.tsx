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

function toTimeInput(value?: string | null): string {
  if (!value) return ''
  if (value.includes('T')) return value.slice(11, 16)
  return value.slice(0, 5)
}

export default function ShiftTypeForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: ShiftTypeFormProps) {
  const [tab, setTab] = useState<'general' | 'schedule' | 'punch'>('general')
  const [form, setForm] = useState<ShiftTypePayload>({
    branchId: initial?.branchId ?? '',
    name: initial?.name ?? '',
    startTime: toTimeInput(initial?.startTime) || '08:00',
    endTime: toTimeInput(initial?.endTime) || '17:00',
    lateGraceMinutes: initial?.lateGraceMinutes ?? 15,
    checkInWindowStart: toTimeInput(initial?.checkInWindowStart),
    checkInWindowEnd: toTimeInput(initial?.checkInWindowEnd),
    checkOutWindowStart: toTimeInput(initial?.checkOutWindowStart),
    checkOutWindowEnd: toTimeInput(initial?.checkOutWindowEnd),
    breakWindowStart: toTimeInput(initial?.breakWindowStart),
    breakWindowEnd: toTimeInput(initial?.breakWindowEnd),
    breakDurationMinutes: initial?.breakDurationMinutes ?? 60,
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
      {
        id: 'punch',
        label: 'Fenêtres pointage',
        hint: 'Laissez vide pour appliquer les valeurs par défaut dérivées des horaires de service.',
        content: () => (
          <div className="grid gap-4 md:grid-cols-2 max-w-3xl">
            <FormField label="Arrivée — début">
              <Input
                type="time"
                value={form.checkInWindowStart ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, checkInWindowStart: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Arrivée — fin">
              <Input
                type="time"
                value={form.checkInWindowEnd ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, checkInWindowEnd: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Départ — début">
              <Input
                type="time"
                value={form.checkOutWindowStart ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, checkOutWindowStart: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Départ — fin">
              <Input
                type="time"
                value={form.checkOutWindowEnd ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, checkOutWindowEnd: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Pause — début">
              <Input
                type="time"
                value={form.breakWindowStart ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, breakWindowStart: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Pause — fin">
              <Input
                type="time"
                value={form.breakWindowEnd ?? ''}
                onChange={(e) =>
                  setForm((f) => ({ ...f, breakWindowEnd: e.target.value }))
                }
              />
            </FormField>
            <FormField label="Durée pause (min)">
              <Input
                type="number"
                min={0}
                value={form.breakDurationMinutes ?? 60}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    breakDurationMinutes: Number(e.target.value) || 0,
                  }))
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
        <FormTabs tabs={tabs} activeTab={tab} onTabChange={(id) => setTab(id as typeof tab)} />
      </FormCard>
    </form>
  )
}
