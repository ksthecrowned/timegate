'use client'

import { useEffect, useState } from 'react'
import { FormField, Input, Textarea, DateField } from '@/components/ui/FormField'
import FormTabs from '@/components/ui/FormTabs'
import { RecordCard, RecordCardField, RecordCardList } from '@/components/ui/RecordCard'
import { SkeletonBlock } from '@/components/ui/Skeleton'
import { toIsoDate, parseApiDate, formatApiDate } from '@/lib/date-utils'
import FileUpload from '@/components/ui/FileUpload'
import ActionButtons from '@/components/ui/ActionButtons'
import {
  createEmployeeContract,
  deleteEmployeeContract,
  listEmployeeContracts,
  updateEmployeeContract,
  type EmployeeContractPayload,
} from '@/lib/timegate/contracts'
import type { EmployeeContract } from '@/lib/timegate/types'
import { ApiErrorBanner, FormCard, primaryBtnClass } from '@/components/timegate/ui'
import { HttpError } from '@/lib/http'

function truncateNotes(notes: string, max = 120): string {
  if (notes.length <= max) return notes
  return `${notes.slice(0, max).trimEnd()}…`
}

type EmployeeContractsCardProps = {
  employeeId: string
  /** Sans carte englobante (ex. onglet du formulaire employé). */
  embedded?: boolean
}

export default function EmployeeContractsCard({
  employeeId,
  embedded = false,
}: EmployeeContractsCardProps) {
  const [tab, setTab] = useState<'list' | 'new' | 'edit'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [contracts, setContracts] = useState<EmployeeContract[]>([])
  const [form, setForm] = useState<EmployeeContractPayload>({
    signedAt: toIsoDate(new Date()),
    renewalsCount: 0,
    notes: '',
  })
  const [file, setFile] = useState<File | undefined>()
  const [fileUploadKey, setFileUploadKey] = useState(0)
  const [listLoading, setListLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const res = await listEmployeeContracts({ employeeId, limit: 20 })
    setContracts(res.data ?? [])
  }

  useEffect(() => {
    setListLoading(true)
    void load()
      .catch((err) =>
        setError(err instanceof HttpError ? err.message : 'Erreur de chargement'),
      )
      .finally(() => setListLoading(false))
  }, [employeeId])

  async function handleDeleteContract(contractId: string) {
    setError('')
    try {
      await deleteEmployeeContract(employeeId, contractId)
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Suppression impossible.')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await createEmployeeContract(employeeId, form, file)
      setForm({
        signedAt: toIsoDate(new Date()),
        renewalsCount: 0,
        notes: '',
      })
      setFile(undefined)
      setFileUploadKey((k) => k + 1)
      await load()
      setTab('list')
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Création impossible.')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
      {
        id: 'list',
        label: 'Historique',
        content: () => (
          <RecordCardList
            items={contracts}
            loading={listLoading}
            loadingSkeleton={
              <div className="space-y-3" aria-busy="true">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-gray-200 p-4 dark:border-neutral-700"
                  >
                    <SkeletonBlock className="h-4 w-36 mb-3" />
                    <SkeletonBlock className="h-3 w-full mb-2" />
                    <SkeletonBlock className="h-3 w-2/3" />
                  </div>
                ))}
              </div>
            }
            emptyMessage="Aucun contrat enregistré."
            keyFn={(row) => row.id}
            renderItem={(row) => (
              <RecordCard
                title={`Signé le ${formatApiDate(row.signedAt)}`}
                badge={
                  row.isCurrent ? (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Courant
                    </span>
                  ) : undefined
                }
                actions={
                  <ActionButtons
                    extra={[
                      {
                        label: 'Modifier',
                        faIcon: 'fa-solid fa-pen',
                        onClick: () => {
                          setEditingId(row.id)
                          setForm({
                            signedAt: row.signedAt.slice(0, 10),
                            expiresAt: row.expiresAt?.slice(0, 10),
                            renewalsCount: row.renewalsCount,
                            notes: row.notes ?? '',
                          })
                          setTab('edit')
                        },
                      },
                    ]}
                    onDelete={() => {
                      void handleDeleteContract(row.id)
                    }}
                  />
                }
              >
                <RecordCardField
                  label="Expire le"
                  value={row.expiresAt ? formatApiDate(row.expiresAt) : '—'}
                />
                <RecordCardField label="Renouvellements" value={String(row.renewalsCount ?? 0)} />
                {row.notes ? (
                  <RecordCardField label="Notes" value={truncateNotes(row.notes)} />
                ) : null}
                <RecordCardField
                  label="Fichier"
                  value={
                    row.contractFileUrl ? (
                      <a
                        href={row.contractFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        Télécharger
                      </a>
                    ) : (
                      '—'
                    )
                  }
                />
              </RecordCard>
            )}
          />
        ),
      },
      {
        id: 'new',
        label: 'Nouveau contrat',
        content: () => (
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Date de signature *">
                <DateField
                  required
                  value={form.signedAt}
                  onChange={(signedAt) => setForm((f) => ({ ...f, signedAt }))}
                />
              </FormField>
              <FormField label="Date d’expiration">
                <DateField
                  value={form.expiresAt ?? ''}
                  minDate={parseApiDate(form.signedAt) ?? undefined}
                  onChange={(expiresAt) =>
                    setForm((f) => ({ ...f, expiresAt: expiresAt || undefined }))
                  }
                />
              </FormField>
              <FormField label="Renouvellements">
                <Input
                  type="number"
                  min={0}
                  value={form.renewalsCount ?? 0}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, renewalsCount: Number(e.target.value) || 0 }))
                  }
                />
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Fichier PDF / image">
                  <FileUpload
                    key={fileUploadKey}
                    accept={{ 'application/pdf': ['.pdf'], 'image/*': [] }}
                    hint="Contrat scanné ou PDF — glissez-déposez ou parcourez."
                    onFiles={(files) => setFile(files[0])}
                    uploadHandler={async (_file, onProgress) => {
                      onProgress(100)
                    }}
                  />
                </FormField>
              </div>
              <div className="md:col-span-2">
                <FormField label="Notes">
                  <Textarea
                    rows={3}
                    value={form.notes ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </FormField>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button type="submit" disabled={loading} className={primaryBtnClass}>
                  {loading ? 'Enregistrement…' : 'Ajouter le contrat'}
                </button>
              </div>
            </div>
          </form>
        ),
      },
      {
        id: 'edit',
        label: 'Modifier',
        content: () => (
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!editingId) return
              setLoading(true)
              setError('')
              try {
                await updateEmployeeContract(employeeId, editingId, form, file)
                setEditingId(null)
                setFile(undefined)
                setFileUploadKey((k) => k + 1)
                await load()
                setTab('list')
              } catch (err) {
                setError(err instanceof HttpError ? err.message : 'Mise à jour impossible.')
              } finally {
                setLoading(false)
              }
            }}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Date de signature *">
                <DateField
                  required
                  value={form.signedAt}
                  onChange={(signedAt) => setForm((f) => ({ ...f, signedAt }))}
                />
              </FormField>
              <FormField label="Date d’expiration">
                <DateField
                  value={form.expiresAt ?? ''}
                  minDate={parseApiDate(form.signedAt) ?? undefined}
                  onChange={(expiresAt) =>
                    setForm((f) => ({ ...f, expiresAt: expiresAt || undefined }))
                  }
                />
              </FormField>
              <FormField label="Renouvellements">
                <Input
                  type="number"
                  min={0}
                  value={form.renewalsCount ?? 0}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, renewalsCount: Number(e.target.value) || 0 }))
                  }
                />
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Nouveau fichier (optionnel)">
                  <FileUpload
                    key={fileUploadKey}
                    accept={{ 'application/pdf': ['.pdf'], 'image/*': [] }}
                    onFiles={(files) => setFile(files[0])}
                    uploadHandler={async (_file, onProgress) => {
                      onProgress(100)
                    }}
                  />
                </FormField>
              </div>
              <div className="md:col-span-2">
                <FormField label="Notes">
                  <Textarea
                    rows={3}
                    value={form.notes ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </FormField>
              </div>
              <div className="md:col-span-2 flex justify-end gap-2">
                <button
                  type="button"
                  className="py-2 px-3 text-sm border rounded-lg"
                  onClick={() => {
                    setEditingId(null)
                    setTab('list')
                  }}
                >
                  Annuler
                </button>
                <button type="submit" disabled={loading} className={primaryBtnClass}>
                  {loading ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </form>
        ),
      },
    ]

  const body = (
    <>
      <ApiErrorBanner message={error} />
      <FormTabs
        tabs={tabs.filter((t) => t.id !== 'edit' || editingId)}
        activeTab={tab}
        onTabChange={(id) => setTab(id as 'list' | 'new' | 'edit')}
      />
    </>
  )

  if (embedded) return body

  return <FormCard title="Contrats">{body}</FormCard>
}
