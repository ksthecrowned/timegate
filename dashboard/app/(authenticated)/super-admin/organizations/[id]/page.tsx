'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import FormTabs from '@/components/ui/FormTabs'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import { FormField, Input, DateField } from '@/components/ui/FormField'
import {
  ApiErrorBanner,
  DetailCard,
  DetailRow,
  FormCard,
  primaryBtnClass,
} from '@/components/timegate/ui'
import {
  createActivationKey,
  createOrganizationAdmin,
  getOrganization,
  type Organization,
} from '@/lib/timegate/super-admin'
import { HttpError } from '@/lib/http'

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [tab, setTab] = useState<'info' | 'admin' | 'activation'>('info')
  const [org, setOrg] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adminForm, setAdminForm] = useState({ email: '', password: '' })
  const [keyForm, setKeyForm] = useState({
    plan: 'DEMO',
    maxEmployees: 50,
    maxDevices: 5,
    expiresAt: '',
  })
  const [adminSuccess, setAdminSuccess] = useState('')
  const [keySuccess, setKeySuccess] = useState('')
  const [plainKey, setPlainKey] = useState('')
  const [submitting, setSubmitting] = useState<'admin' | 'key' | null>(null)

  useEffect(() => {
    void getOrganization(id)
      .then((found) => setOrg(found))
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleCreateAdmin(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting('admin')
    setError('')
    setAdminSuccess('')
    try {
      const created = await createOrganizationAdmin(id, adminForm)
      setAdminSuccess(`Admin créé : ${created.email}`)
      setAdminForm({ email: '', password: '' })
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
      const created = await createActivationKey(id, {
        plan: keyForm.plan,
        maxEmployees: keyForm.maxEmployees,
        maxDevices: keyForm.maxDevices,
        expiresAt: keyForm.expiresAt || undefined,
      })
      setPlainKey(created.activationKey)
      setKeySuccess('Clé d’activation générée — copiez-la maintenant, elle ne sera plus affichée.')
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Création clé impossible.')
    } finally {
      setSubmitting(null)
    }
  }

  const tabs = [
      {
        id: 'info',
        label: 'Informations',
        content: () => org ? (
          <DetailCard title={org.name}>
            <DetailRow label="SKU" value={org.sku} />
            <DetailRow
              label="Créée le"
              value={new Date(org.createdAt).toLocaleDateString('fr-FR')}
            />
          </DetailCard>
        ) : null,
      },
      {
        id: 'admin',
        label: 'Administrateur',
        content: () => (
          <form onSubmit={handleCreateAdmin}>
            <FormCard
              title="Créer un administrateur"
              footer={
                <button
                  type="submit"
                  disabled={submitting === 'admin'}
                  className={primaryBtnClass}
                >
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
          <form onSubmit={handleCreateKey}>
            <FormCard
              title="Générer une clé d’activation"
              footer={
                <button
                  type="submit"
                  disabled={submitting === 'key'}
                  className={primaryBtnClass}
                >
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
                <FormField label="Plan *">
                  <Input
                    required
                    value={keyForm.plan}
                    onChange={(e) => setKeyForm((f) => ({ ...f, plan: e.target.value }))}
                  />
                </FormField>
                <FormField label="Max employés *">
                  <Input
                    required
                    type="number"
                    min={1}
                    value={keyForm.maxEmployees}
                    onChange={(e) =>
                      setKeyForm((f) => ({ ...f, maxEmployees: Number(e.target.value) }))
                    }
                  />
                </FormField>
                <FormField label="Kiosques max. *">
                  <Input
                    required
                    type="number"
                    min={1}
                    value={keyForm.maxDevices}
                    onChange={(e) =>
                      setKeyForm((f) => ({ ...f, maxDevices: Number(e.target.value) }))
                    }
                  />
                </FormField>
                <FormField label="Expiration">
                  <DateField
                    value={keyForm.expiresAt}
                    onChange={(expiresAt) => setKeyForm((f) => ({ ...f, expiresAt }))}
                  />
                </FormField>
              </div>
            </FormCard>
          </form>
        ),
      },
    ]

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Super admin', href: '/super-admin/organizations' },
          { label: 'Organisations', href: '/super-admin/organizations' },
          { label: org?.name ?? 'Détail' },
        ]}
        action={
          <Link href="/super-admin/organizations" className={primaryBtnClass}>
            Retour
          </Link>
        }
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : org ? (
        <div className="bg-white border border-gray-200 shadow-xs rounded-xl dark:bg-neutral-900 dark:border-neutral-700">
          <div className="border-b border-gray-200 px-4 py-4 md:px-5 dark:border-neutral-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{org.name}</h2>
            <p className="text-sm text-gray-500 dark:text-neutral-400">SKU {org.sku}</p>
          </div>
          <div className="p-4 md:p-5">
            <FormTabs tabs={tabs} activeTab={tab} onTabChange={(id) => setTab(id as 'info' | 'admin' | 'activation')} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
