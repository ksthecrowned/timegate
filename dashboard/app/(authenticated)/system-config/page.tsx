'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { FormField, Input } from '@/components/ui/FormField'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import { ApiErrorBanner, FormCard, primaryBtnClass } from '@/components/timegate/ui'
import { HttpError } from '@/lib/http'
import {
  getTenantSystemConfig,
  updateTenantSystemConfig,
} from '@/lib/timegate/tenant-settings'

export default function SystemConfigPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({
    minConfidence: 0.75,
    lateThreshold: 10,
    veryLateThreshold: 30,
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const config = await getTenantSystemConfig()
      setForm({
        minConfidence: config.minConfidence,
        lateThreshold: config.lateThreshold,
        veryLateThreshold: config.veryLateThreshold,
      })
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await updateTenantSystemConfig(form)
      setSuccess('Paramètres enregistrés.')
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Mise à jour impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Organisation', href: '/organization' },
          { label: 'Reconnaissance & retards' },
        ]}
      />

      {error ? <ApiErrorBanner message={error} /> : null}
      {success ? (
        <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-700 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-400">
          {success}
        </div>
      ) : null}

      {loading ? (
        <SkeletonDetailCard />
      ) : (
        <form onSubmit={handleSave}>
          <FormCard
            title="Seuils de reconnaissance et retards"
            hint="Ces paramètres s'appliquent uniquement à votre organisation."
            footer={
              <button type="submit" disabled={saving} className={primaryBtnClass}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            }
          >
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                label="Confiance faciale min."
                hint="Seuil minimum de confiance pour valider une reconnaissance faciale (0 à 1)."
              >
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={1}
                  value={form.minConfidence}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, minConfidence: Number(e.target.value) }))
                  }
                />
              </FormField>
              <FormField label="Seuil retard (min)">
                <Input
                  type="number"
                  min={0}
                  value={form.lateThreshold}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lateThreshold: Number(e.target.value) }))
                  }
                />
              </FormField>
              <FormField label="Seuil retard majeur (min)">
                <Input
                  type="number"
                  min={0}
                  value={form.veryLateThreshold}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, veryLateThreshold: Number(e.target.value) }))
                  }
                />
              </FormField>
            </div>
          </FormCard>
        </form>
      )}
    </div>
  )
}
