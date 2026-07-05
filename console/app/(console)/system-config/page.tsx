'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import { FormField, Input } from '@/components/ui/FormField'
import { ApiErrorBanner, FormCard, primaryBtnClass } from '@/components/timegate/ui'
import { HttpError } from '@/lib/http'
import { listSystemConfigs, updateSystemConfig } from '@/lib/api/saas'
import type { SystemConfig } from '@/lib/api/types'

const columns: Column<SystemConfig>[] = [
  {
    key: 'company',
    label: 'Organisation',
    render: (_, row) => row.company?.name ?? row.companyId,
  },
  {
    key: 'minConfidence',
    label: 'Confiance faciale',
    render: (v) => Number(v).toFixed(2),
  },
  { key: 'lateThreshold', label: 'Tolérance retard (min)' },
  { key: 'veryLateThreshold', label: 'Retard majeur (min)' },
]

export default function SystemConfigPage() {
  const [rows, setRows] = useState<SystemConfig[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [form, setForm] = useState({
    minConfidence: '0.75',
    lateThreshold: '10',
    veryLateThreshold: '30',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [rows, selectedId],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listSystemConfigs({ page: 1, limit: 200 })
      setRows(res.data)
      if (!selectedId && res.data.length > 0) {
        const first = res.data[0]
        setSelectedId(first.id)
        setForm({
          minConfidence: String(first.minConfidence),
          lateThreshold: String(first.lateThreshold),
          veryLateThreshold: String(first.veryLateThreshold),
        })
      }
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => {
    void load()
  }, [load])

  function selectConfig(row: SystemConfig) {
    setSelectedId(row.id)
    setForm({
      minConfidence: String(row.minConfidence),
      lateThreshold: String(row.lateThreshold),
      veryLateThreshold: String(row.veryLateThreshold),
    })
    setSuccess('')
    setError('')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const updated = await updateSystemConfig(selected.id, {
        minConfidence: Number(form.minConfidence),
        lateThreshold: Number(form.lateThreshold),
        veryLateThreshold: Number(form.veryLateThreshold),
      })
      setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
      setSuccess('Seuils enregistrés.')
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader breadcrumbs={[{ label: 'System config' }]} />
      <ApiErrorBanner message={error} />
      {success ? (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-700 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-400">
          {success}
        </div>
      ) : null}

      <DataTable
        loading={loading}
        data={rows}
        columns={columns}
        entityLabel="organisations"
        tableId="hs-system-config-table"
        emptyMessage="Aucune configuration système."
        actions={(row) => (
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={() => selectConfig(row)}
          >
            Éditer
          </button>
        )}
      />

      {selected ? (
        <form onSubmit={handleSave}>
          <FormCard
            title={`Seuils super-admin — ${selected.company?.name ?? selected.companyId}`}
            footer={
              <button type="submit" disabled={saving} className={primaryBtnClass}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            }
          >
            <div className="grid gap-4 md:grid-cols-3">
              <FormField label="Confiance faciale min.">
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  max={1}
                  value={form.minConfidence}
                  onChange={(e) => setForm((f) => ({ ...f, minConfidence: e.target.value }))}
                />
              </FormField>
              <FormField label="Tolérance retard (min)">
                <Input
                  type="number"
                  min={0}
                  value={form.lateThreshold}
                  onChange={(e) => setForm((f) => ({ ...f, lateThreshold: e.target.value }))}
                />
              </FormField>
              <FormField label="Retard majeur (min)">
                <Input
                  type="number"
                  min={0}
                  value={form.veryLateThreshold}
                  onChange={(e) => setForm((f) => ({ ...f, veryLateThreshold: e.target.value }))}
                />
              </FormField>
            </div>
          </FormCard>
        </form>
      ) : null}
    </div>
  )
}
