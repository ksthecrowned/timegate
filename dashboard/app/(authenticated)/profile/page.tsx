'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import PageHeader from '@/components/ui/PageHeader'
import FormTabs from '@/components/ui/FormTabs'
import { FormField, Input } from '@/components/ui/FormField'
import { useOrganization } from '@/components/providers/OrganizationProvider'
import { fetchTimeGateMe } from '@/lib/auth/timegate-auth'
import type { TimeGateUser } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function ProfilePage() {
  const { data: session } = useSession()
  const { company } = useOrganization()
  const orgLabel = company?.name ?? 'Aucune organisation'
  const [tab, setTab] = useState<'info' | 'password'>('info')
  const [profile, setProfile] = useState<TimeGateUser | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!session?.accessToken) return
    setLoading(true)
    setError('')
    void fetchTimeGateMe(session.accessToken)
      .then(setProfile)
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [session?.accessToken])

  const tabs = [
      {
        id: 'info',
        label: 'Informations',
        content: () => (
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
            <FormField label="Email">
              <Input value={profile?.email ?? session?.user?.email ?? ''} readOnly />
            </FormField>
            <FormField label="Rôle">
              <Input value={profile?.role ?? session?.user?.role ?? ''} readOnly />
            </FormField>
            <FormField label="Organisation">
              <Input value={orgLabel} readOnly />
            </FormField>
            <FormField label="Statut">
              <Input value={loading ? 'Chargement...' : 'Connecté'} readOnly />
            </FormField>
            <div className="md:col-span-2 flex justify-end">
              <button
                disabled
                className="py-2 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-gray-400 text-white cursor-not-allowed"
              >
                Mise à jour profil à venir
              </button>
            </div>
          </div>
        ),
      },
      {
        id: 'password',
        label: 'Mot de passe',
        content: () => (
          <div className="grid md:grid-cols-1 gap-4 max-w-md">
            <FormField label="Mot de passe actuel">
              <Input type="password" placeholder="••••••••" />
            </FormField>
            <FormField label="Nouveau mot de passe">
              <Input type="password" placeholder="••••••••" />
            </FormField>
            <FormField label="Confirmer">
              <Input type="password" placeholder="••••••••" />
            </FormField>
            <div className="flex justify-end">
              <button className="py-2 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-primary text-white hover:bg-secondary">
                Changer
              </button>
            </div>
          </div>
        ),
      },
    ]

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: 'Profil' }]} />

      <div className="bg-white border border-gray-200 shadow-xs rounded-xl dark:bg-neutral-900 dark:border-neutral-700 mt-4">
        <div className="p-6 flex items-start gap-x-5 border-b border-gray-200 dark:border-neutral-700">
          <div className="relative">
            <div className="shrink-0 size-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl font-bold text-white">
              {(profile?.email ?? session?.user?.email ?? 'U').charAt(0).toUpperCase()}
            </div>
            <button className="absolute -bottom-1 -right-1 size-7 rounded-full bg-white dark:bg-neutral-700 border border-gray-200 dark:border-neutral-600 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-xs">
              <svg className="size-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </button>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{profile?.email ?? session?.user?.email ?? 'Utilisateur'}</h1>
            <p className="text-sm text-gray-500 dark:text-neutral-400">{orgLabel}</p>
            <span className="inline-flex items-center px-2.5 py-0.5 mt-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">{profile?.role ?? session?.user?.role ?? 'ADMIN'}</span>
          </div>
        </div>

        <div className="p-6">
          {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
          <FormTabs tabs={tabs} activeTab={tab} onTabChange={(id) => setTab(id as 'info' | 'password')} flush={false} />
        </div>
      </div>
    </div>
  )
}
