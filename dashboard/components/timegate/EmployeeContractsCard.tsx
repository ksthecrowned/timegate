'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { FormField, Input, Textarea, DateField } from '@/components/ui/FormField'
import { SkeletonBlock } from '@/components/ui/Skeleton'
import StatusBadge from '@/components/ui/StatusBadge'
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
import {
  ApiErrorBanner,
  FormCard,
  primaryBtnClass,
  secondaryBtnClass,
} from '@/components/timegate/ui'
import { useSubscriptionAccess } from '@/components/providers/SubscriptionAccessProvider'
import { HttpError } from '@/lib/http'

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function daysUntilExpiry(expiresAt?: string | null): number | null {
  if (!expiresAt) return null
  const end = parseApiDate(expiresAt)
  if (!end) return null
  const today = startOfLocalDay(new Date())
  const endDay = startOfLocalDay(end)
  return Math.round((endDay.getTime() - today.getTime()) / 86_400_000)
}

function contractExpiryStatus(expiresAt?: string | null): 'Expiré' | 'Expire bientôt' | null {
  const days = daysUntilExpiry(expiresAt)
  if (days == null) return null
  if (days < 0) return 'Expiré'
  if (days <= 30) return 'Expire bientôt'
  return null
}

function expiryHint(expiresAt?: string | null): string | null {
  const days = daysUntilExpiry(expiresAt)
  if (days == null) return null
  if (days < 0) return `Expiré depuis ${Math.abs(days)} j`
  if (days === 0) return 'Expire aujourd’hui'
  if (days === 1) return 'Expire demain'
  if (days <= 30) return `Dans ${days} j`
  return null
}

function isLikelyPdf(url: string): boolean {
  return /\.pdf($|\?)/i.test(url) || url.toLowerCase().includes('application/pdf')
}

function isLikelyImage(url: string): boolean {
  return /\.(jpe?g|png|webp|gif)($|\?)/i.test(url)
}

function ContractBadges({ row }: { row: EmployeeContract }): ReactNode {
  const expiry = contractExpiryStatus(row.expiresAt)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {row.isCurrent ? <StatusBadge status="Courant" /> : <StatusBadge status="Historique" />}
      {expiry ? <StatusBadge status={expiry} /> : null}
    </div>
  )
}

const panelClass =
  'rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 dark:border-border-dark dark:bg-white/3'

const emptyForm = (): EmployeeContractPayload => ({
  signedAt: toIsoDate(new Date()),
  renewalsCount: 0,
  notes: '',
})

type Mode = 'list' | 'new' | 'edit'

type EmployeeContractsCardProps = {
  employeeId: string
  /** Sans carte englobante (ex. onglet fiche employé). */
  embedded?: boolean
}

export default function EmployeeContractsCard({
  employeeId,
  embedded = false,
}: EmployeeContractsCardProps) {
  const { canWrite } = useSubscriptionAccess()
  const [mode, setMode] = useState<Mode>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [contracts, setContracts] = useState<EmployeeContract[]>([])
  const [form, setForm] = useState<EmployeeContractPayload>(emptyForm)
  const [file, setFile] = useState<File | undefined>()
  const [fileUploadKey, setFileUploadKey] = useState(0)
  const [listLoading, setListLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const res = await listEmployeeContracts({ employeeId, limit: 50 })
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

  const { current, past } = useMemo(() => {
    const sorted = [...contracts].sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1
      return String(b.signedAt).localeCompare(String(a.signedAt))
    })
    return {
      current: sorted.find((c) => c.isCurrent) ?? null,
      past: sorted.filter((c) => !c.isCurrent),
    }
  }, [contracts])

  function resetFormState() {
    setForm(emptyForm())
    setFile(undefined)
    setFileUploadKey((k) => k + 1)
    setEditingId(null)
  }

  function openNew(prefill?: Partial<EmployeeContractPayload>) {
    setEditingId(null)
    setFile(undefined)
    setFileUploadKey((k) => k + 1)
    setForm({ ...emptyForm(), ...prefill })
    setError('')
    setMode('new')
  }

  function openEdit(row: EmployeeContract) {
    setEditingId(row.id)
    setFile(undefined)
    setFileUploadKey((k) => k + 1)
    setForm({
      signedAt: row.signedAt.slice(0, 10),
      expiresAt: row.expiresAt?.slice(0, 10),
      renewalsCount: row.renewalsCount,
      notes: row.notes ?? '',
    })
    setError('')
    setMode('edit')
  }

  function backToList() {
    resetFormState()
    setMode('list')
    setError('')
  }

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
      if (mode === 'edit' && editingId) {
        await updateEmployeeContract(employeeId, editingId, form, file)
      } else {
        await createEmployeeContract(employeeId, form, file)
      }
      resetFormState()
      await load()
      setMode('list')
    } catch (err) {
      setError(
        err instanceof HttpError
          ? err.message
          : mode === 'edit'
            ? 'Mise à jour impossible.'
            : 'Création impossible.',
      )
    } finally {
      setLoading(false)
    }
  }

  function FileLinks({ url }: { url: string }) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-3 text-sm">
          <a href={url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
            {isLikelyPdf(url) ? 'Ouvrir le PDF' : 'Ouvrir'}
          </a>
          <a
            href={url}
            download
            className="text-slate-600 hover:underline dark:text-slate-300"
          >
            Télécharger
          </a>
        </div>
        {isLikelyImage(url) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Aperçu du contrat"
            className="max-h-36 rounded-lg border border-slate-200/80 object-contain dark:border-border-dark"
          />
        ) : null}
      </div>
    )
  }

  function MetaRow({ label, value }: { label: string; value: ReactNode }) {
    return (
      <div className="grid gap-0.5 text-sm sm:grid-cols-3 sm:gap-3">
        <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="text-slate-900 sm:col-span-2 dark:text-slate-200">{value}</dd>
      </div>
    )
  }

  function ContractPanel({
    row,
    featured = false,
  }: {
    row: EmployeeContract
    featured?: boolean
  }) {
    const hint = expiryHint(row.expiresAt)
    return (
      <article
        className={[
          panelClass,
          featured ? 'ring-1 ring-primary/25' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <ContractBadges row={row} />
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              Signé le {formatApiDate(row.signedAt)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {row.expiresAt
                ? `Expire le ${formatApiDate(row.expiresAt)}${hint ? ` · ${hint}` : ''}`
                : 'Sans date d’expiration'}
              {row.renewalsCount > 0 ? ` · ${row.renewalsCount} renouvellement(s)` : ''}
            </p>
          </div>
          <ActionButtons
            deleteMessage="Supprimer définitivement ce contrat ?"
            extra={[
              {
                label: 'Modifier',
                faIcon: 'fa-solid fa-pen',
                onClick: () => openEdit(row),
              },
              ...(row.isCurrent
                ? [
                    {
                      label: 'Renouveler',
                      faIcon: 'fa-solid fa-rotate',
                      onClick: () =>
                        openNew({
                          renewalsCount: (row.renewalsCount ?? 0) + 1,
                          notes: row.notes ?? '',
                        }),
                    },
                  ]
                : []),
            ]}
            onDelete={() => {
              void handleDeleteContract(row.id)
            }}
          />
        </div>

        <dl className="mt-3 space-y-2 border-t border-slate-200/70 pt-3 dark:border-border-dark">
          {row.notes ? <MetaRow label="Notes" value={row.notes} /> : null}
          <MetaRow
            label="Fichier"
            value={row.contractFileUrl ? <FileLinks url={row.contractFileUrl} /> : '—'}
          />
        </dl>
      </article>
    )
  }

  function ContractForm() {
    return (
      <form onSubmit={(e) => void handleSubmit(e)} className={panelClass}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-slate-800 dark:text-slate-100">
              {mode === 'edit' ? 'Modifier le contrat' : 'Nouveau contrat'}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {mode === 'edit'
                ? 'Mettez à jour les dates, le fichier ou les notes.'
                : 'Le nouveau contrat devient le contrat courant.'}
            </p>
          </div>
          <button type="button" className={secondaryBtnClass} onClick={backToList}>
            Retour
          </button>
        </div>

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
            <FormField
              label={mode === 'edit' ? 'Nouveau fichier (optionnel)' : 'Fichier PDF / image'}
            >
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
          <div className="md:col-span-2 flex justify-end gap-2">
            <button type="button" className={secondaryBtnClass} onClick={backToList}>
              Annuler
            </button>
            <button type="submit" disabled={loading} className={primaryBtnClass}>
              {loading
                ? 'Enregistrement…'
                : mode === 'edit'
                  ? 'Enregistrer'
                  : 'Ajouter le contrat'}
            </button>
          </div>
        </div>
      </form>
    )
  }

  function ListView() {
    if (listLoading) {
      return (
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className={panelClass}>
              <SkeletonBlock className="mb-3 h-4 w-36" />
              <SkeletonBlock className="mb-2 h-3 w-full" />
              <SkeletonBlock className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      )
    }

    if (contracts.length === 0) {
      return (
        <div className={`${panelClass} flex flex-col items-center gap-3 py-10 text-center`}>
          <p className="text-sm text-slate-500 dark:text-slate-400">Aucun contrat enregistré.</p>
          {canWrite ? (
            <button type="button" className={primaryBtnClass} onClick={() => openNew()}>
              Ajouter un contrat
            </button>
          ) : null}
        </div>
      )
    }

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {contracts.length} contrat{contracts.length > 1 ? 's' : ''}
            {current ? ' · 1 courant' : ''}
          </p>
          {canWrite ? (
            <button type="button" className={primaryBtnClass} onClick={() => openNew()}>
              Nouveau contrat
            </button>
          ) : null}
        </div>

        {current ? (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Contrat courant
            </h3>
            <ContractPanel row={current} featured />
          </div>
        ) : null}

        {past.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Historique ({past.length})
            </h3>
            <div className="space-y-3">
              {past.map((row) => (
                <ContractPanel key={row.id} row={row} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  const body = (
    <div className="space-y-4">
      <ApiErrorBanner message={error} />
      {mode === 'list' ? <ListView /> : <ContractForm />}
    </div>
  )

  if (embedded) {
    return body
  }

  return <FormCard title="Contrats">{body}</FormCard>
}
