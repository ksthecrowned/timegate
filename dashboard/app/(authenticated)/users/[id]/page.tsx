'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import { FormField, MultiSelect } from '@/components/ui/FormField'
import {
  ApiErrorBanner,
  DetailCard,
  DetailRow,
  FormCard,
  primaryBtnClass,
  secondaryBtnClass,
} from '@/components/timegate/ui'
import { AdminRoleBadge } from '@/components/users/AdminRoleBadge'
import {
  getManagedLocations,
  listAdminUsers,
  setManagedLocations,
  type AdminUser,
} from '@/lib/timegate/auth-admin'
import { getMyCompany } from '@/lib/timegate/company'
import { listLocations } from '@/lib/timegate/locations'
import { toSelectOptions } from '@/lib/select-options'
import type { SelectOption } from '@/components/ui/select-search-types'
import { HttpError } from '@/lib/http'

export default function UserDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [user, setUser] = useState<AdminUser | null>(null)
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([])
  const [selected, setSelected] = useState<SelectOption[]>([])
  const [scopedManagers, setScopedManagers] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [users, company, locs, managed] = await Promise.all([
        listAdminUsers(),
        getMyCompany(),
        listLocations({ limit: 100, isActive: true }),
        getManagedLocations(params.id),
      ])
      const found = users.find((u) => u.id === params.id) ?? null
      setUser(found)
      setScopedManagers(company.usage?.capabilities?.includes('scoped_managers') ?? false)
      const opts = toSelectOptions(locs.data)
      setLocationOptions(opts)
      const ids = new Set(managed.locations.map((l) => l.id))
      setSelected(opts.filter((o) => ids.has(o.value)))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Chargement impossible')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    void load()
  }, [load])

  async function saveScope() {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await setManagedLocations(
        params.id,
        selected.map((o) => o.value),
      )
      setSuccess('Périmètre enregistré.')
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Utilisateurs', href: '/users' },
          { label: user?.email ?? 'Détail' },
        ]}
        action={
          <button type="button" className={secondaryBtnClass} onClick={() => router.push('/users')}>
            Retour
          </button>
        }
      />
      <ApiErrorBanner message={error} />
      {success && (
        <p className="mb-4 text-sm text-teal-700 dark:text-teal-400">{success}</p>
      )}
      {loading ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : user ? (
        <div className="space-y-4">
          <DetailCard title={user.email}>
            <DetailRow label="Rôle" value={<AdminRoleBadge role={user.role} />} />
            <DetailRow
              label="Lieux"
              value={
                user.managedLocations?.length
                  ? user.managedLocations.map((l) => l.name).join(', ')
                  : '—'
              }
            />
          </DetailCard>

          {user.role === 'MANAGER' && (
            <FormCard
              title="Périmètre de lieux"
              footer={
                scopedManagers ? (
                  <button
                    type="button"
                    disabled={saving}
                    className={primaryBtnClass}
                    onClick={() => void saveScope()}
                  >
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </button>
                ) : undefined
              }
            >
              {!scopedManagers ? (
                <p className="text-sm text-slate-500">
                  Activez la capacité <code>scoped_managers</code> sur le plan pour limiter ce
                  manager à des lieux (pas au département).
                </p>
              ) : (
                <FormField
                  label="Lieux gérés"
                  hint="Le manager ne voit que l’équipe / anomalies de ces lieux."
                >
                  <MultiSelect
                    options={locationOptions}
                    value={selected}
                    onChange={(opts) => setSelected([...opts])}
                    placeholder="Sélectionner des lieux…"
                  />
                </FormField>
              )}
            </FormCard>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Utilisateur introuvable.</p>
      )}
    </div>
  )
}
