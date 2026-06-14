'use client'

import { useEffect, useState } from 'react'
import { FormField, SelectSearch, Textarea, DateField } from '@/components/ui/FormField'
import FormTabs from '@/components/ui/FormTabs'
import { normalizeApiDate, parseApiDate } from '@/lib/date-utils'
import { findOption, toSelectOptions } from '@/lib/select-options'
import { listEmployees, getEmployeeLeaveBalances } from '@/lib/timegate/employees'
import { listLeaveTypes } from '@/lib/timegate/refs'
import type { LeavePayload } from '@/lib/timegate/leaves'
import type { LeaveStatus } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import type { SelectOption } from '@/components/ui/select-search-types'

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'PENDING', label: 'En attente' },
  { value: 'APPROVED', label: 'Approuvé' },
  { value: 'REJECTED', label: 'Rejeté' },
]

type LeaveFormProps = {
  initial?: Partial<LeavePayload>
  submitLabel: string
  onSubmit: (values: LeavePayload) => Promise<void>
  onCancel?: () => void
}

export default function LeaveForm({ initial, submitLabel, onSubmit, onCancel }: LeaveFormProps) {
  const [tab, setTab] = useState<'employee' | 'period'>('employee')
  const [form, setForm] = useState<LeavePayload>({
    employeeId: initial?.employeeId ?? '',
    startDate: normalizeApiDate(initial?.startDate),
    endDate: normalizeApiDate(initial?.endDate),
    reason: initial?.reason ?? '',
    status: (initial?.status as LeaveStatus | undefined) ?? 'PENDING',
    leaveTypeId: initial?.leaveTypeId ?? '',
  })
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([])
  const [leaveTypeOptions, setLeaveTypeOptions] = useState<SelectOption[]>([])
  const [balanceHint, setBalanceHint] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void Promise.all([listEmployees({ limit: 100 }), listLeaveTypes()]).then(
      ([employees, leaveTypes]) => {
        setEmployeeOptions(
          toSelectOptions(
            employees.data.map((e) => ({
              id: e.id,
              name: `${e.firstName} ${e.lastName}`.trim(),
            })),
          ),
        )
        setLeaveTypeOptions(toSelectOptions(leaveTypes.data))
      },
    )
  }, [])

  useEffect(() => {
    if (!form.employeeId) {
      setBalanceHint('')
      return
    }
    void getEmployeeLeaveBalances(form.employeeId)
      .then((result) => {
        const selected = result.balances.find((b) =>
          form.leaveTypeId ? b.leaveTypeId === form.leaveTypeId : !b.unlimited,
        )
        if (!selected) {
          setBalanceHint('')
          return
        }
        if (selected.unlimited) {
          setBalanceHint(`${selected.leaveTypeName} : sans limite de solde`)
          return
        }
        setBalanceHint(
          `${selected.leaveTypeName} (${result.year}) : ${selected.remaining ?? 0} jour(s) restant(s) sur ${selected.allocated ?? 0}`,
        )
      })
      .catch(() => setBalanceHint(''))
  }, [form.employeeId, form.leaveTypeId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        ...form,
        reason: form.reason?.trim() || undefined,
        leaveTypeId: form.leaveTypeId || undefined,
      })
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible.')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
      {
        id: 'employee',
        label: 'Employé',
        content: () => (
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Employé *">
              <SelectSearch
                required
                options={employeeOptions}
                value={findOption(employeeOptions, form.employeeId)}
                onChange={(opt) => setForm((f) => ({ ...f, employeeId: opt?.value ?? '' }))}
                placeholder="Sélectionner…"
              />
            </FormField>
            <FormField label="Type de congé">
              <SelectSearch
                options={leaveTypeOptions}
                value={findOption(leaveTypeOptions, form.leaveTypeId ?? '')}
                onChange={(opt) => setForm((f) => ({ ...f, leaveTypeId: opt?.value ?? '' }))}
                placeholder="Par défaut si vide"
                isClearable
              />
            </FormField>
            {balanceHint && (
              <p className="md:col-span-2 text-sm text-primary dark:text-teal-300">{balanceHint}</p>
            )}
            <FormField label="Statut">
              <SelectSearch
                options={STATUS_OPTIONS}
                value={findOption(STATUS_OPTIONS, form.status ?? 'PENDING')}
                onChange={(opt) =>
                  setForm((f) => ({ ...f, status: (opt?.value as LeaveStatus) ?? 'PENDING' }))
                }
              />
            </FormField>
          </div>
        ),
      },
      {
        id: 'period',
        label: 'Période & motif',
        content: () => (
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Date début *">
              <DateField
                required
                value={form.startDate}
                onChange={(startDate) => setForm((f) => ({ ...f, startDate }))}
              />
            </FormField>
            <FormField label="Date fin *">
              <DateField
                required
                value={form.endDate}
                minDate={parseApiDate(form.startDate) ?? undefined}
                onChange={(endDate) => setForm((f) => ({ ...f, endDate }))}
              />
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Motif">
                <Textarea
                  rows={3}
                  value={form.reason ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                />
              </FormField>
            </div>
          </div>
        ),
      },
    ]

  return (
    <form onSubmit={handleSubmit}>
      <FormCard
        title="Congé"
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
        <FormTabs tabs={tabs} activeTab={tab} onTabChange={(id) => setTab(id as 'employee' | 'period')} />
      </FormCard>
    </form>
  )
}
