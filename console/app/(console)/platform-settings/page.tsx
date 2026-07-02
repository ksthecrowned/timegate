'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { FormField, Input } from '@/components/ui/FormField'
import { ApiErrorBanner, FormCard, primaryBtnClass } from '@/components/timegate/ui'
import { getPlatformSettings, updatePlatformSettings } from '@/lib/api/saas'
import type { PlatformSettings } from '@/lib/api/types'
import { HttpError } from '@/lib/http'

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [form, setForm] = useState({
    trialDays: '',
    trialMaxEmployees: '',
    trialMaxKiosks: '',
    gracePeriodDays: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await getPlatformSettings()
      setSettings(data)
      setForm({
        trialDays: String(data.trialDays),
        trialMaxEmployees: String(data.trialMaxEmployees),
        trialMaxKiosks: String(data.trialMaxKiosks),
        gracePeriodDays: String(data.gracePeriodDays),
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const updated = await updatePlatformSettings({
        trialDays: Number(form.trialDays),
        trialMaxEmployees: Number(form.trialMaxEmployees),
        trialMaxKiosks: Number(form.trialMaxKiosks),
        gracePeriodDays: Number(form.gracePeriodDays),
      })
      setSettings(updated)
      setSuccess('Paramètres enregistrés.')
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: 'Paramètres plateforme' }]} />
      <ApiErrorBanner message={error} />
      {success && (
        <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-700 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-400">
          {success}
        </div>
      )}
      {loading && !settings && <p className="text-sm text-slate-500">Chargement…</p>}
      {settings && (
        <form onSubmit={handleSubmit}>
          <FormCard
            title="Essai gratuit & grâce"
            footer={
              <button type="submit" disabled={saving} className={primaryBtnClass}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            }
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Durée essai (jours)">
                <Input
                  required
                  type="number"
                  min={1}
                  value={form.trialDays}
                  onChange={(e) => setForm((f) => ({ ...f, trialDays: e.target.value }))}
                />
              </FormField>
              <FormField label="Grâce lecture seule (jours)">
                <Input
                  required
                  type="number"
                  min={0}
                  value={form.gracePeriodDays}
                  onChange={(e) => setForm((f) => ({ ...f, gracePeriodDays: e.target.value }))}
                />
              </FormField>
              <FormField label="Max employés (trial)">
                <Input
                  required
                  type="number"
                  min={1}
                  value={form.trialMaxEmployees}
                  onChange={(e) => setForm((f) => ({ ...f, trialMaxEmployees: e.target.value }))}
                />
              </FormField>
              <FormField label="Max kiosks (trial)">
                <Input
                  required
                  type="number"
                  min={1}
                  value={form.trialMaxKiosks}
                  onChange={(e) => setForm((f) => ({ ...f, trialMaxKiosks: e.target.value }))}
                />
              </FormField>
            </div>
          </FormCard>
        </form>
      )}
    </div>
  )
}
