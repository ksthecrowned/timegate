'use client'

import { useEffect, useState } from 'react'
import { FormField, Input, SelectSearch, Textarea } from '@/components/ui/FormField'
import FormTabs from '@/components/ui/FormTabs'
import { findOption, toSelectOptions } from '@/lib/select-options'
import { listEmployees } from '@/lib/timegate/employees'
import type { SalaryPayload } from '@/lib/timegate/salaries'
import { HttpError } from '@/lib/http'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import type { SelectOption } from '@/components/ui/select-search-types'

type SalaryFormProps = {
  initial?: Partial<SalaryPayload>
  submitLabel: string
  onSubmit: (values: SalaryPayload) => Promise<void>
  onCancel?: () => void
}

export default function SalaryForm({ initial, submitLabel, onSubmit, onCancel }: SalaryFormProps) {
  const [tab, setTab] = useState<'period' | 'amounts'>('period')
  const [form, setForm] = useState<SalaryPayload>({
    employeeId: initial?.employeeId ?? '',
    year: initial?.year ?? new Date().getFullYear(),
    month: initial?.month ?? new Date().getMonth() + 1,
    baseSalary: initial?.baseSalary ?? 0,
    bonuses: initial?.bonuses ?? 0,
    deductions: initial?.deductions ?? 0,
    notes: initial?.notes ?? '',
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
    if (!form.employeeId) {
      setTab('period')
      setError('Sélectionnez un employé.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        ...form,
        notes: form.notes?.trim() || undefined,
      })
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible.')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
      {
        id: 'period',
        label: 'Période',
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
            <FormField label="Année *">
              <Input
                required
                type="number"
                min={2000}
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
              />
            </FormField>
            <FormField label="Mois *">
              <Input
                required
                type="number"
                min={1}
                max={12}
                value={form.month}
                onChange={(e) => setForm((f) => ({ ...f, month: Number(e.target.value) }))}
              />
            </FormField>
          </div>
        ),
      },
      {
        id: 'amounts',
        label: 'Montants',
        content: () => (
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Salaire de base *">
              <Input
                required
                type="number"
                min={0}
                step="0.01"
                value={form.baseSalary}
                onChange={(e) => setForm((f) => ({ ...f, baseSalary: Number(e.target.value) }))}
              />
            </FormField>
            <FormField label="Primes">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.bonuses ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, bonuses: Number(e.target.value) }))}
              />
            </FormField>
            <FormField label="Retenues">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.deductions ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, deductions: Number(e.target.value) }))}
              />
            </FormField>
            <div className="md:col-span-2">
              <FormField label="Notes">
                <Textarea
                  rows={3}
                  value={form.notes ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
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
        title="Salaire"
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
        <FormTabs tabs={tabs} activeTab={tab} onTabChange={(id) => setTab(id as 'period' | 'amounts')} />
      </FormCard>
    </form>
  )
}
