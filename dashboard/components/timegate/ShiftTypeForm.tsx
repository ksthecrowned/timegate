'use client'

import { useEffect, useMemo, useState } from 'react'
import { FormField, Input, SelectSearch, SwitcherField } from '@/components/ui/FormField'
import FormTabs from '@/components/ui/FormTabs'
import { findOption, toSelectOptions } from '@/lib/select-options'
import { listBranches } from '@/lib/timegate/branches'
import type { ShiftTypePayload, ShiftWeekDayPayload } from '@/lib/timegate/shift-types'
import { getTenantAttendanceSettings } from '@/lib/timegate/tenant-settings'
import { WEEK_DAY_LABELS, WEEK_DAY_OPTIONS } from '@/lib/timegate/work-days'
import type { WeekDayName } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import type { SelectOption } from '@/components/ui/select-search-types'

type ShiftTypeFormProps = {
  initial?: Partial<ShiftTypePayload> & { weekDays?: ShiftWeekDayPayload[] }
  submitLabel: string
  onSubmit: (values: ShiftTypePayload) => Promise<void>
  onCancel?: () => void
}

function toTimeInput(value?: string | null): string {
  if (!value) return ''
  if (value.includes('T')) return value.slice(11, 16)
  return value.slice(0, 5)
}

type DayRow = { enabled: boolean; startTime: string; endTime: string }

const DEFAULT_DAYS: WeekDayName[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']

function buildDayState(
  weekDays: ShiftWeekDayPayload[] | undefined,
  defaultStart: string,
  defaultEnd: string,
  isCreate: boolean,
): Record<WeekDayName, DayRow> {
  const base = Object.fromEntries(
    WEEK_DAY_OPTIONS.map((o) => [
      o.value as WeekDayName,
      {
        enabled: isCreate ? DEFAULT_DAYS.includes(o.value as WeekDayName) : false,
        startTime: defaultStart,
        endTime: defaultEnd,
      },
    ]),
  ) as Record<WeekDayName, DayRow>

  for (const wd of weekDays ?? []) {
    base[wd.day] = {
      enabled: true,
      startTime: toTimeInput(wd.startTime) || defaultStart,
      endTime: toTimeInput(wd.endTime) || defaultEnd,
    }
  }
  return base
}

export default function ShiftTypeForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: ShiftTypeFormProps) {
  const isCreate = !initial?.name
  const startDefault = toTimeInput(initial?.startTime) || '08:00'
  const endDefault = toTimeInput(initial?.endTime) || '17:00'
  const [tab, setTab] = useState<'general' | 'schedule' | 'days' | 'punch'>('general')
  const [form, setForm] = useState<ShiftTypePayload>({
    branchId: initial?.branchId ?? '',
    name: initial?.name ?? '',
    startTime: startDefault,
    endTime: endDefault,
    lateGraceMinutes: initial?.lateGraceMinutes ?? 15,
    checkInWindowStart: toTimeInput(initial?.checkInWindowStart),
    checkInWindowEnd: toTimeInput(initial?.checkInWindowEnd),
    checkOutWindowStart: toTimeInput(initial?.checkOutWindowStart),
    checkOutWindowEnd: toTimeInput(initial?.checkOutWindowEnd),
    breakWindowStart: toTimeInput(initial?.breakWindowStart),
    breakWindowEnd: toTimeInput(initial?.breakWindowEnd),
    breakDurationMinutes: initial?.breakDurationMinutes ?? 60,
  })
  const [days, setDays] = useState<Record<WeekDayName, DayRow>>(() =>
    buildDayState(initial?.weekDays, startDefault, endDefault, isCreate),
  )
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const enabledCount = useMemo(
    () => Object.values(days).filter((d) => d.enabled).length,
    [days],
  )

  useEffect(() => {
    void listBranches({ limit: 100 }).then((res) => setBranchOptions(toSelectOptions(res.data)))
  }, [])

  useEffect(() => {
    if (!isCreate) return
    void getTenantAttendanceSettings()
      .then((settings) => {
        setForm((prev) => ({
          ...prev,
          breakWindowStart: toTimeInput(settings.defaultBreakWindowStart) || '12:00',
          breakWindowEnd: toTimeInput(settings.defaultBreakWindowEnd) || '13:00',
          breakDurationMinutes: settings.defaultBreakDurationMinutes ?? 60,
        }))
      })
      .catch(() => {
        /* keep local defaults */
      })
  }, [isCreate])

  function applyDefaultHoursToEnabledDays() {
    setDays((prev) => {
      const next = { ...prev }
      for (const key of Object.keys(next) as WeekDayName[]) {
        if (next[key].enabled) {
          next[key] = {
            ...next[key],
            startTime: form.startTime,
            endTime: form.endTime,
          }
        }
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const weekDays: ShiftWeekDayPayload[] = (Object.keys(days) as WeekDayName[])
        .filter((day) => days[day].enabled)
        .map((day) => ({
          day,
          startTime: days[day].startTime,
          endTime: days[day].endTime,
        }))
      if (weekDays.length === 0) {
        setError('Sélectionnez au moins un jour travaillé.')
        setTab('days')
        return
      }
      await onSubmit({
        ...form,
        name: form.name.trim(),
        lateGraceMinutes: form.lateGraceMinutes ?? undefined,
        weekDays,
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
      label: 'Heures type',
      content: () => (
        <div className="grid max-w-2xl gap-4 md:grid-cols-2">
          <FormField label="Heure début *" hint="Référence ; chaque jour peut les surcharger.">
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
          <div className="md:col-span-2">
            <button
              type="button"
              className={secondaryBtnClass}
              onClick={applyDefaultHoursToEnabledDays}
            >
              Appliquer ces heures aux jours cochés
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 'days',
      label: `Jours (${enabledCount})`,
      hint: 'Sans jour coché, personne n’est prévu sur cet horaire.',
      content: () => (
        <div className="space-y-3">
          {(Object.keys(WEEK_DAY_LABELS) as WeekDayName[]).map((day) => (
            <div
              key={day}
              className="grid items-center gap-3 rounded-lg border border-slate-200/80 p-3 md:grid-cols-[180px_1fr_1fr] dark:border-border-dark"
            >
              <SwitcherField
                label={WEEK_DAY_LABELS[day]}
                checked={days[day].enabled}
                onCheckedChange={(enabled) =>
                  setDays((prev) => ({
                    ...prev,
                    [day]: {
                      enabled,
                      startTime: enabled ? prev[day].startTime || form.startTime : prev[day].startTime,
                      endTime: enabled ? prev[day].endTime || form.endTime : prev[day].endTime,
                    },
                  }))
                }
              />
              <FormField label="Début">
                <Input
                  type="time"
                  disabled={!days[day].enabled}
                  value={days[day].startTime}
                  onChange={(e) =>
                    setDays((prev) => ({
                      ...prev,
                      [day]: { ...prev[day], startTime: e.target.value },
                    }))
                  }
                />
              </FormField>
              <FormField label="Fin">
                <Input
                  type="time"
                  disabled={!days[day].enabled}
                  value={days[day].endTime}
                  onChange={(e) =>
                    setDays((prev) => ({
                      ...prev,
                      [day]: { ...prev[day], endTime: e.target.value },
                    }))
                  }
                />
              </FormField>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: 'punch',
      label: 'Fenêtres pointage',
      hint: 'Laissez vide pour appliquer les valeurs par défaut dérivées des horaires de service.',
      content: () => (
        <div className="grid max-w-3xl gap-4 md:grid-cols-2">
          <FormField label="Arrivée — début">
            <Input
              type="time"
              value={form.checkInWindowStart ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, checkInWindowStart: e.target.value }))}
            />
          </FormField>
          <FormField label="Arrivée — fin">
            <Input
              type="time"
              value={form.checkInWindowEnd ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, checkInWindowEnd: e.target.value }))}
            />
          </FormField>
          <FormField label="Départ — début">
            <Input
              type="time"
              value={form.checkOutWindowStart ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, checkOutWindowStart: e.target.value }))}
            />
          </FormField>
          <FormField label="Départ — fin">
            <Input
              type="time"
              value={form.checkOutWindowEnd ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, checkOutWindowEnd: e.target.value }))}
            />
          </FormField>
          <FormField label="Pause — début">
            <Input
              type="time"
              value={form.breakWindowStart ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, breakWindowStart: e.target.value }))}
            />
          </FormField>
          <FormField label="Pause — fin">
            <Input
              type="time"
              value={form.breakWindowEnd ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, breakWindowEnd: e.target.value }))}
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
        hint="Affectation → jours de cet horaire → heures. Les exceptions de journée surchargent une date."
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
