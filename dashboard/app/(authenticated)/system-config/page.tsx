'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { RecordCard, RecordCardField, RecordCardList } from '@/components/ui/RecordCard'
import { SkeletonBlock } from '@/components/ui/Skeleton'
import { listSystemConfigs, updateSystemConfig } from '@/lib/timegate/admin-saas'
import type { SystemConfig } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'
import { FormField, Input } from '@/components/ui/FormField'

function ConfigCardsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 p-4 dark:border-neutral-700"
        >
          <SkeletonBlock className="h-4 w-48 mb-3" />
          <SkeletonBlock className="h-3 w-full mb-2" />
          <SkeletonBlock className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  )
}

function configToForm(row: SystemConfig) {
  return {
    id: row.id,
    minConfidence: row.minConfidence,
    lateThreshold: row.lateThreshold,
    veryLateThreshold: row.veryLateThreshold,
    companyName: row.company?.name ?? '',
  }
}

export default function SystemConfigPage() {
  const [data, setData] = useState<SystemConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    id: '',
    minConfidence: 0.75,
    lateThreshold: 10,
    veryLateThreshold: 30,
    companyName: '',
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rows = (await listSystemConfigs({ page: 1, limit: 100 })).data ?? []
      setData(rows)
      if (rows[0]) {
        setForm(configToForm(rows[0]))
      }
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function selectRow(row: SystemConfig) {
    setForm(configToForm(row))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.id) return
    setSaving(true)
    setError('')
    try {
      await updateSystemConfig(form.id, {
        minConfidence: form.minConfidence,
        lateThreshold: form.lateThreshold,
        veryLateThreshold: form.veryLateThreshold,
      })
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Mise à jour impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: 'Configuration système' }]} />
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}
      {loading ? (
        <ConfigCardsSkeleton />
      ) : (
        <RecordCardList
          items={data}
          emptyMessage="Aucune configuration trouvée."
          keyFn={(row) => row.id}
          renderItem={(row) => (
            <RecordCard
              title={row.company?.name ?? '—'}
              selected={form.id === row.id}
              onClick={() => selectRow(row)}
            >
              <RecordCardField
                label="Confiance min."
                value={
                  row.minConfidence != null
                    ? `${Math.round(Number(row.minConfidence) * 100)} %`
                    : '—'
                }
              />
              <RecordCardField label="Seuil retard (min)" value={String(row.lateThreshold)} />
              <RecordCardField
                label="Seuil retard majeur (min)"
                value={String(row.veryLateThreshold)}
              />
            </RecordCard>
          )}
        />
      )}
      <form
        onSubmit={handleSave}
        className="mt-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900"
      >
        <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
          {form.companyName.trim()
            ? `Modifier la configuration — ${form.companyName}`
            : 'Modifier la configuration'}
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <FormField label="Confiance min.">
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
        <div className="mt-4 flex justify-end">
          <button
            disabled={saving || !form.id}
            className="py-2 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-primary text-white hover:bg-secondary disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
