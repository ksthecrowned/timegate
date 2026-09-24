'use client'

import { useEffect, useState } from 'react'
import { FormField, Input, MultiSelect, SelectSearch } from '@/components/ui/FormField'
import { findOption, toSelectOptions } from '@/lib/select-options'
import { createAdminUser, type CreateAdminUserPayload } from '@/lib/timegate/auth-admin'
import { getMyCompany } from '@/lib/timegate/company'
import { listLocations } from '@/lib/timegate/locations'
import { getRoleLabel } from '@/lib/timegate/roles'
import type { TimeGateRole } from '@/lib/timegate/types'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import type { SelectOption } from '@/components/ui/select-search-types'
import { HttpError } from '@/lib/http'

const ROLE_OPTIONS: SelectOption[] = (['ADMIN', 'MANAGER'] as TimeGateRole[]).map((role) => ({
  value: role,
  label: getRoleLabel(role),
}))

type AdminUserFormProps = {
  onSuccess?: () => void
  onCancel?: () => void
}

export default function AdminUserForm({ onSuccess, onCancel }: AdminUserFormProps) {
  const [form, setForm] = useState<CreateAdminUserPayload>({
    email: '',
    password: '',
    role: 'MANAGER',
    locationIds: [],
  })
  const [locationOptions, setLocationOptions] = useState<SelectOption[]>([])
  const [scopedManagers, setScopedManagers] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        const [company, locs] = await Promise.all([
          getMyCompany(),
          listLocations({ limit: 100, isActive: true }),
        ])
        setScopedManagers(company.usage?.capabilities?.includes('scoped_managers') ?? false)
        setLocationOptions(toSelectOptions(locs.data))
      } catch {
        /* ignore — form still usable */
      }
    })()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const payload: CreateAdminUserPayload = {
        email: form.email,
        password: form.password,
        role: form.role,
        ...(form.role === 'MANAGER' && form.locationIds?.length
          ? { locationIds: form.locationIds }
          : {}),
      }
      const created = await createAdminUser(payload)
      setSuccess(`Utilisateur ${created.email} créé.`)
      setForm({ email: '', password: '', role: 'MANAGER', locationIds: [] })
      onSuccess?.()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Création impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormCard
        title="Nouvel utilisateur"
        footer={
          <>
            {onCancel && (
              <button type="button" onClick={onCancel} className={secondaryBtnClass}>
                Annuler
              </button>
            )}
            <button type="submit" disabled={loading} className={primaryBtnClass}>
              {loading ? 'Création…' : 'Créer'}
            </button>
          </>
        }
      >
        <ApiErrorBanner message={error} />
        {success && (
          <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-700 dark:bg-teal-900/20 dark:border-teal-800 dark:text-teal-400">
            {success}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Email *">
            <Input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </FormField>
          <FormField label="Mot de passe *">
            <Input
              required
              type="password"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </FormField>
          <FormField label="Rôle *">
            <SelectSearch
              required
              options={ROLE_OPTIONS}
              value={findOption(ROLE_OPTIONS, form.role)}
              onChange={(opt) =>
                setForm((f) => ({
                  ...f,
                  role: (opt?.value as TimeGateRole) ?? 'MANAGER',
                  locationIds: [],
                }))
              }
            />
          </FormField>
          {form.role === 'MANAGER' && scopedManagers && (
            <FormField
              label="Lieux gérés"
              hint="Périmètre du manager (département ≠ équipe). Capacité scoped_managers."
            >
              <MultiSelect
                options={locationOptions}
                value={locationOptions.filter((o) => form.locationIds?.includes(o.value))}
                onChange={(opts) =>
                  setForm((f) => ({
                    ...f,
                    locationIds: opts.map((o) => o.value),
                  }))
                }
                placeholder="Sélectionner des lieux…"
              />
            </FormField>
          )}
        </div>
      </FormCard>
    </form>
  )
}
