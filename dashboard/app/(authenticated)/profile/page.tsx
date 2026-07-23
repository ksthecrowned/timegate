'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import PageHeader from '@/components/ui/PageHeader'
import FormTabs from '@/components/ui/FormTabs'
import { FormField, Input } from '@/components/ui/FormField'
import { useOrganization } from '@/components/providers/OrganizationProvider'
import { fetchTimeGateMe } from '@/lib/auth/timegate-auth'
import { changePassword, updateProfile } from '@/lib/timegate/auth-profile'
import type { TimeGateUser } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function ProfilePage() {
  const { data: session, update: updateSession } = useSession()
  const { company } = useOrganization()
  const orgLabel = company?.name ?? 'Aucune organisation'
  const [tab, setTab] = useState<'info' | 'password'>('info')
  const [profile, setProfile] = useState<TimeGateUser | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!session?.accessToken) return
    setLoading(true)
    setError('')
    void fetchTimeGateMe(session.accessToken)
      .then((me) => {
        setProfile(me)
        setFirstName(me.firstName ?? '')
        setLastName(me.lastName ?? '')
      })
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [session?.accessToken])

  async function handleSaveProfile() {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const updated = await updateProfile({ firstName, lastName })
      setProfile(updated)
      await updateSession({
        user: { firstName: updated.firstName, lastName: updated.lastName },
      })
      setSuccess('Profil mis à jour.')
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      setError('La confirmation ne correspond pas au nouveau mot de passe.')
      return
    }
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await changePassword({ currentPassword, newPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess('Mot de passe modifié.')
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Modification impossible')
    } finally {
      setSaving(false)
    }
  }

  const displayEmail = profile?.email ?? session?.user?.email ?? 'Utilisateur'

  const tabs = [
    {
      id: 'info',
      label: 'Informations',
      content: () => (
        <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
          <FormField label="Prénom">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </FormField>
          <FormField label="Nom">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </FormField>
          <FormField label="Email">
            <Input value={profile?.email ?? session?.user?.email ?? ''} readOnly />
          </FormField>
          <FormField label="Rôle">
            <Input value={profile?.role ?? session?.user?.role ?? ''} readOnly />
          </FormField>
          <FormField label="Organisation">
            <Input value={orgLabel} readOnly />
          </FormField>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="button"
              disabled={saving || loading}
              onClick={() => void handleSaveProfile()}
              className="py-2 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-primary text-white hover:bg-secondary disabled:opacity-50"
            >
              {saving ? 'Enregistrement…' : 'Enregistrer'}
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
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
            />
          </FormField>
          <FormField label="Nouveau mot de passe">
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </FormField>
          <FormField label="Confirmer">
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </FormField>
          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving || !currentPassword || !newPassword}
              onClick={() => void handleChangePassword()}
              className="py-2 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-primary text-white hover:bg-secondary disabled:opacity-50"
            >
              {saving ? 'Modification…' : 'Changer'}
            </button>
          </div>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: 'Profil' }]} />

      <div className="bg-surface-card border border-slate-200/80 shadow-xs rounded-xl dark:bg-surface-card-dark dark:border-border-dark mt-4">
        <div className="p-6 flex items-start gap-x-5 border-b border-slate-200/80 dark:border-border-dark">
          <div className="relative">
            <div className="shrink-0 size-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl font-bold text-white">
              {displayEmail.charAt(0).toUpperCase()}
            </div>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{displayEmail}</h1>
            <p className="text-sm text-gray-500 dark:text-neutral-400">{orgLabel}</p>
            <span className="inline-flex items-center px-2.5 py-0.5 mt-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              {profile?.role ?? session?.user?.role ?? 'ADMIN'}
            </span>
          </div>
        </div>

        <div className="p-6">
          {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
          {success && <p className="mb-4 text-sm text-primary dark:text-teal-300">{success}</p>}
          <FormTabs tabs={tabs} activeTab={tab} onTabChange={(id) => setTab(id as 'info' | 'password')} flush={false} />
        </div>
      </div>
    </div>
  )
}
