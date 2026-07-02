'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import { FormField, Input } from '@/components/ui/FormField'
import { ApiErrorBanner, FormCard, primaryBtnClass } from '@/components/timegate/ui'
import { createPlan, listPlans, updatePlan } from '@/lib/api/saas'
import type { SubscriptionPlan } from '@/lib/api/types'
import { HttpError } from '@/lib/http'

const emptyForm = {
  code: '',
  label: '',
  maxEmployees: '50',
  maxKiosks: '5',
  durationDays: '365',
  sortOrder: '0',
}

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(emptyForm)
  const [submitting, setSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setPlans(await listPlans(true))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        label: form.label.trim(),
        maxEmployees: Number(form.maxEmployees),
        maxKiosks: Number(form.maxKiosks),
        durationDays: form.durationDays ? Number(form.durationDays) : undefined,
        sortOrder: Number(form.sortOrder),
      }
      if (editingId) {
        await updatePlan(editingId, payload)
      } else {
        await createPlan(payload)
      }
      setForm(emptyForm)
      setEditingId(null)
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(plan: SubscriptionPlan) {
    setEditingId(plan.id)
    setForm({
      code: plan.code,
      label: plan.label,
      maxEmployees: String(plan.maxEmployees),
      maxKiosks: String(plan.maxKiosks),
      durationDays: plan.durationDays != null ? String(plan.durationDays) : '',
      sortOrder: String(plan.sortOrder),
    })
  }

  async function toggleActive(plan: SubscriptionPlan) {
    setError('')
    try {
      await updatePlan(plan.id, { isActive: !plan.isActive })
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Mise à jour impossible.')
    }
  }

  const columns: Column<SubscriptionPlan>[] = [
    { key: 'code', label: 'Code', sortable: true },
    { key: 'label', label: 'Libellé', sortable: true },
    { key: 'maxEmployees', label: 'Employés' },
    { key: 'maxKiosks', label: 'Kiosks' },
    {
      key: 'durationDays',
      label: 'Durée (j)',
      render: (v) => (v == null ? '—' : String(v)),
    },
    {
      key: 'isActive',
      label: 'Actif',
      render: (v) => (v ? 'Oui' : 'Non'),
    },
  ]

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: 'Plans d’abonnement' }]} />
      <ApiErrorBanner message={error} />

      <form onSubmit={handleSubmit} className="mb-8">
        <FormCard
          title={editingId ? 'Modifier le plan' : 'Nouveau plan'}
          footer={
            <>
              {editingId && (
                <button
                  type="button"
                  className={primaryBtnClass}
                  onClick={() => {
                    setEditingId(null)
                    setForm(emptyForm)
                  }}
                >
                  Annuler
                </button>
              )}
              <button type="submit" disabled={submitting} className={primaryBtnClass}>
                {submitting ? 'Enregistrement…' : editingId ? 'Mettre à jour' : 'Créer'}
              </button>
            </>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Code *">
              <Input
                required
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
            </FormField>
            <FormField label="Libellé *">
              <Input
                required
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              />
            </FormField>
            <FormField label="Durée (jours)">
              <Input
                type="number"
                min={1}
                value={form.durationDays}
                onChange={(e) => setForm((f) => ({ ...f, durationDays: e.target.value }))}
              />
            </FormField>
            <FormField label="Max employés *">
              <Input
                required
                type="number"
                min={1}
                value={form.maxEmployees}
                onChange={(e) => setForm((f) => ({ ...f, maxEmployees: e.target.value }))}
              />
            </FormField>
            <FormField label="Max kiosks *">
              <Input
                required
                type="number"
                min={1}
                value={form.maxKiosks}
                onChange={(e) => setForm((f) => ({ ...f, maxKiosks: e.target.value }))}
              />
            </FormField>
            <FormField label="Ordre">
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              />
            </FormField>
          </div>
        </FormCard>
      </form>

      <DataTable
        loading={loading}
        data={plans}
        columns={columns}
        entityLabel="plans"
        tableId="hs-plans-table"
        emptyMessage="Aucun plan."
        actions={(row) => (
          <div className="flex gap-2">
            <button type="button" className="text-sm text-primary hover:underline" onClick={() => startEdit(row)}>
              Modifier
            </button>
            <button type="button" className="text-sm text-slate-600 hover:underline" onClick={() => void toggleActive(row)}>
              {row.isActive ? 'Désactiver' : 'Activer'}
            </button>
          </div>
        )}
      />
    </div>
  )
}
