'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import FormTabs from '@/components/ui/FormTabs'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import { FormField, Input } from '@/components/ui/FormField'
import {
  ApiErrorBanner,
  DetailCard,
  DetailRow,
  FormCard,
  primaryBtnClass,
  secondaryBtnClass,
} from '@/components/timegate/ui'
import {
  createActivationKey,
  createOrganizationAdmin,
  getOrganization,
  setOrganizationSuspension,
} from '@/lib/api/organizations'
import { expiresAtFromMonths, listPlans } from '@/lib/api/saas'
import type { Organization, OrganizationActivationKey, SubscriptionPlan } from '@/lib/api/types'
import { formatApiDate, formatApiDateTime } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'
import StatusBadge from '@/components/ui/StatusBadge'
import DataTable, { Column } from '@/components/ui/DataTable'

const orgKeyColumns: Column<OrganizationActivationKey>[] = [
  { key: 'plan', label: 'Plan', sortable: true },
  {
    key: 'maxEmployees',
    label: 'Max emp.',
    render: (v) => (v == null ? '—' : String(v)),
  },
  {
    key: 'maxKiosks',
    label: 'Max kiosks',
    render: (v, row) => String(v ?? row.maxDevices ?? '—'),
  },
  {
    key: 'status',
    label: 'État',
    render: (v) => (v ? <StatusBadge status={String(v)} /> : '—'),
  },
  {
    key: 'usedAt',
    label: 'Utilisée le',
    render: (v, row) =>
      row.status === 'USED' && v ? formatApiDateTime(String(v)) : '—',
  },
  {
    key: 'expiresAt',
    label: 'Expire le',
    render: (v) => formatApiDate(v == null ? null : String(v)),
  },
  {
    key: 'createdAt',
    label: 'Créée le',
    render: (v) => formatApiDate(v == null ? null : String(v)),
  },
]

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [tab, setTab] = useState<'info' | 'admin' | 'activation'>('info')
  const [org, setOrg] = useState<Organization | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adminForm, setAdminForm] = useState({ email: '', password: '' })
  const [keyForm, setKeyForm] = useState({
    planId: '',
    durationMonths: '' as '' | '3' | '6' | '12',
    maxEmployees: '',
    maxDevices: '',
  })
  const [adminSuccess, setAdminSuccess] = useState('')
  const [keySuccess, setKeySuccess] = useState('')
  const [plainKey, setPlainKey] = useState('')
  const [submitting, setSubmitting] = useState<'admin' | 'key' | 'suspend' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [found, catalog] = await Promise.all([getOrganization(id), listPlans()])
      setOrg(found)
      setPlans(catalog.filter((p) => p.isActive))
      setKeyForm((f) => {
        if (f.planId) return f
        const first = catalog.find((p) => p.isActive)?.id ?? catalog[0]?.id ?? ''
        return { ...f, planId: first }
      })
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting('admin')
    setError('')
    setAdminSuccess('')
    try {
      const created = await createOrganizationAdmin(id, adminForm)
      setAdminSuccess(`Admin créé : ${created.email}`)
      setAdminForm({ email: '', password: '' })
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Création admin impossible.')
    } finally {
      setSubmitting(null)
    }
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting('key')
    setError('')
    setKeySuccess('')
    setPlainKey('')
    try {
      const selectedPlan = plans.find((p) => p.id === keyForm.planId)
      const expiresAt =
        keyForm.durationMonths !== ''
          ? expiresAtFromMonths(Number(keyForm.durationMonths))
          : undefined

      const created = await createActivationKey(id, {
        planId: keyForm.planId || undefined,
        maxEmployees: keyForm.maxEmployees ? Number(keyForm.maxEmployees) : undefined,
        maxDevices: keyForm.maxDevices ? Number(keyForm.maxDevices) : undefined,
        expiresAt,
      })
      setPlainKey(created.activationKey)
      setKeySuccess(
        `Clé générée (${selectedPlan?.label ?? created.plan}) — copiez-la maintenant.`,
      )
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Création clé impossible.')
    } finally {
      setSubmitting(null)
    }
  }

  async function toggleSuspension() {
    if (!org) return
    setSubmitting('suspend')
    setError('')
    try {
      await setOrganizationSuspension(id, !org.suspendedAt)
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Suspension impossible.')
    } finally {
      setSubmitting(null)
    }
  }

  const subscription = org?.subscriptions?.[0]

  const tabs = [
    {
      id: 'info',
      label: 'Informations',
      content: () =>
        org ? (
          <DetailCard title={org.name}>
            <DetailRow label="SKU" value={org.sku} />
            <DetailRow
              label="Statut"
              value={org.suspendedAt ? 'Suspendue' : 'Active'}
            />
            <DetailRow
              label="Créée le"
              value={new Date(org.createdAt).toLocaleDateString('fr-FR')}
            />
            {subscription && (
              <>
                <DetailRow label="Plan actuel" value={subscription.plan} />
                <DetailRow
                  label="Expiration"
                  value={
                    subscription.expiresAt
                      ? new Date(subscription.expiresAt).toLocaleDateString('fr-FR')
                      : '—'
                  }
                />
              </>
            )}
          </DetailCard>
        ) : null,
    },
    {
      id: 'admin',
      label: 'Administrateur',
      content: () => (
        <form onSubmit={handleCreateAdmin}>
          <FormCard
            title="Créer un administrateur tenant"
            footer={
              <button type="submit" disabled={submitting === 'admin'} className={primaryBtnClass}>
                {submitting === 'admin' ? 'Création…' : 'Créer l’admin'}
              </button>
            }
          >
            {adminSuccess && (
              <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-700 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-400">
                {adminSuccess}
              </div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Email *">
                <Input
                  required
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm((f) => ({ ...f, email: e.target.value }))}
                />
              </FormField>
              <FormField label="Mot de passe *">
                <Input
                  required
                  type="password"
                  minLength={8}
                  value={adminForm.password}
                  onChange={(e) => setAdminForm((f) => ({ ...f, password: e.target.value }))}
                />
              </FormField>
            </div>
          </FormCard>
        </form>
      ),
    },
    {
      id: 'activation',
      label: 'Activation',
      content: () => (
        <div className="space-y-6">
          <form onSubmit={handleCreateKey}>
            <FormCard
              title="Générer une clé d’activation"
              footer={
                <button type="submit" disabled={submitting === 'key'} className={primaryBtnClass}>
                  {submitting === 'key' ? 'Génération…' : 'Générer la clé'}
                </button>
              }
            >
              {keySuccess && (
                <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-700 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-400">
                  {keySuccess}
                  {plainKey && (
                    <div className="mt-2 font-mono text-base font-semibold">{plainKey}</div>
                  )}
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Plan catalogue *">
                  <select
                    required
                    className="input"
                    value={keyForm.planId}
                    onChange={(e) => setKeyForm((f) => ({ ...f, planId: e.target.value }))}
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label} ({p.code}) — {p.maxEmployees} emp. / {p.maxKiosks} kiosks
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Durée override">
                  <select
                    className="input"
                    value={keyForm.durationMonths}
                    onChange={(e) =>
                      setKeyForm((f) => ({
                        ...f,
                        durationMonths: e.target.value as '' | '3' | '6' | '12',
                      }))
                    }
                  >
                    <option value="">Défaut plan</option>
                    <option value="3">3 mois</option>
                    <option value="6">6 mois</option>
                    <option value="12">12 mois</option>
                  </select>
                </FormField>
                <FormField label="Max employés (override)">
                  <Input
                    type="number"
                    min={1}
                    placeholder="Optionnel"
                    value={keyForm.maxEmployees}
                    onChange={(e) => setKeyForm((f) => ({ ...f, maxEmployees: e.target.value }))}
                  />
                </FormField>
                <FormField label="Kiosks max (override)">
                  <Input
                    type="number"
                    min={1}
                    placeholder="Optionnel"
                    value={keyForm.maxDevices}
                    onChange={(e) => setKeyForm((f) => ({ ...f, maxDevices: e.target.value }))}
                  />
                </FormField>
              </div>
            </FormCard>
          </form>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-neutral-200">
              Clés de cette organisation
            </h3>
            <DataTable
              data={org?.activationKeys ?? []}
              columns={orgKeyColumns}
              entityLabel="clés"
              tableId="hs-org-activation-keys-table"
              emptyMessage="Aucune clé pour cette organisation."
            />
          </div>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Organisations', href: '/organizations' },
          { label: org?.name ?? 'Détail' },
        ]}
        action={
          <div className="flex gap-2">
            <Link href="/organizations" className={secondaryBtnClass}>
              Retour
            </Link>
            {org && (
              <button
                type="button"
                disabled={submitting === 'suspend'}
                className={primaryBtnClass}
                onClick={() => void toggleSuspension()}
              >
                {org.suspendedAt ? 'Réactiver' : 'Suspendre'}
              </button>
            )}
          </div>
        }
      />
      <ApiErrorBanner message={error} />
      {org?.suspendedAt && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300">
          Organisation suspendue depuis le {new Date(org.suspendedAt).toLocaleString('fr-FR')}.
        </div>
      )}
      {loading ? (
        <SkeletonDetailCard />
      ) : org ? (
        <div className="bg-white border border-gray-200 shadow-xs rounded-xl dark:bg-neutral-900 dark:border-neutral-700">
          <div className="border-b border-gray-200 px-4 py-4 md:px-5 dark:border-neutral-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{org.name}</h2>
            <p className="text-sm text-gray-500 dark:text-neutral-400">SKU {org.sku}</p>
          </div>
          <div className="p-4 md:p-5">
            <FormTabs
              tabs={tabs}
              activeTab={tab}
              onTabChange={(next) => setTab(next as 'info' | 'admin' | 'activation')}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
