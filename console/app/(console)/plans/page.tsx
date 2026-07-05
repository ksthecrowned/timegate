'use client'

import { ApiErrorBanner, FormCard, primaryBtnClass } from '@/components/timegate/ui'
import DataTable, { Column } from '@/components/ui/DataTable'
import { FormField, Input } from '@/components/ui/FormField'
import PageHeader from '@/components/ui/PageHeader'
import { SwitcherField } from '@/components/ui/Switcher'
import { createPlan, listPlans, updatePlan, type PlanAiFeatures } from '@/lib/api/saas'
import type { SubscriptionPlan } from '@/lib/api/types'
import { HttpError } from '@/lib/http'
import { useCallback, useEffect, useState } from 'react'

const emptyForm = {
  code: '',
  label: '',
  maxEmployees: '50',
  maxKiosks: '5',
  durationDays: '365',
  sortOrder: '0',
  aiCopilotEnabled: true,
  aiTokensPerMonth: '500000',
  aiUnlimited: false,
}

function readAiFeatures(plan: SubscriptionPlan): {
  aiCopilotEnabled: boolean
  aiTokensPerMonth: string
  aiUnlimited: boolean
} {
  const features = (plan.features ?? {}) as PlanAiFeatures
  const unlimited = features.aiTokensPerMonth === null
  return {
    aiCopilotEnabled: features.aiCopilotEnabled !== false,
    aiTokensPerMonth:
      unlimited || features.aiTokensPerMonth == null
        ? '500000'
        : String(features.aiTokensPerMonth),
    aiUnlimited: unlimited,
  }
}

function buildFeatures(form: typeof emptyForm): PlanAiFeatures {
  return {
    aiCopilotEnabled: form.aiCopilotEnabled,
    aiTokensPerMonth: form.aiUnlimited ? null : Number(form.aiTokensPerMonth),
  }
}

function formatAiQuota(plan: SubscriptionPlan): string {
  const features = (plan.features ?? {}) as PlanAiFeatures
  if (features.aiCopilotEnabled === false) return 'Désactivé'
  if (features.aiTokensPerMonth === null) return 'Illimité'
  if (typeof features.aiTokensPerMonth === 'number') {
    return `${features.aiTokensPerMonth.toLocaleString('fr-FR')} tok/mois`
  }
  return 'Par défaut'
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
        features: buildFeatures(form),
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
    const ai = readAiFeatures(plan)
    setEditingId(plan.id)
    setForm({
      code: plan.code,
      label: plan.label,
      maxEmployees: String(plan.maxEmployees),
      maxKiosks: String(plan.maxKiosks),
      durationDays: plan.durationDays != null ? String(plan.durationDays) : '',
      sortOrder: String(plan.sortOrder),
      ...ai,
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
      key: 'features',
      label: 'Copilote IA',
      render: (_v, row) => formatAiQuota(row),
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

          <div className="mt-6 border-t border-slate-200/80 pt-5 dark:border-border-dark">
            <h3 className="mb-3 text-sm font-semibold text-slate-800 dark:text-slate-100">
              Copilote IA (manager)
            </h3>
            <div className="grid gap-4 md:grid-cols-3">
              <SwitcherField
                label="Copilote activé"
                checked={form.aiCopilotEnabled}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, aiCopilotEnabled: checked }))}
              />
              <SwitcherField
                label="Quota illimité"
                checked={form.aiUnlimited}
                onCheckedChange={(checked) => setForm((f) => ({ ...f, aiUnlimited: checked }))}
              />
              <FormField label="Tokens / mois">
                <Input
                  type="number"
                  min={1000}
                  step={1000}
                  disabled={form.aiUnlimited || !form.aiCopilotEnabled}
                  value={form.aiTokensPerMonth}
                  onChange={(e) => setForm((f) => ({ ...f, aiTokensPerMonth: e.target.value }))}
                />
              </FormField>
            </div>
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
