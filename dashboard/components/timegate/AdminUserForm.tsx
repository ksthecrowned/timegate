'use client'

import { useSession } from 'next-auth/react'
import { useState } from 'react'
import { FormField, Input, SelectSearch } from '@/components/ui/FormField'
import { findOption } from '@/lib/select-options'
import { createAdminUser, type CreateAdminUserPayload } from '@/lib/timegate/auth-admin'
import { getRoleLabel } from '@/lib/timegate/roles'
import type { TimeGateRole } from '@/lib/timegate/types'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import type { SelectOption } from '@/components/ui/select-search-types'
import { HttpError } from '@/lib/http'

const ROLE_OPTIONS: SelectOption[] = (
  ['ADMIN', 'MANAGER'] as TimeGateRole[]
).map((role) => ({ value: role, label: getRoleLabel(role) }))

type AdminUserFormProps = {
  onSuccess?: () => void
  onCancel?: () => void
}

export default function AdminUserForm({ onSuccess, onCancel }: AdminUserFormProps) {
  const { data: session } = useSession()
  const [form, setForm] = useState<CreateAdminUserPayload>({
    email: '',
    password: '',
    role: 'MANAGER',
    companyId: session?.user?.companyId ?? undefined,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const created = await createAdminUser({
        ...form,
        companyId: session?.user?.companyId ?? undefined,
      })
      setSuccess(`Utilisateur ${created.email} créé.`)
      setForm({ email: '', password: '', role: 'MANAGER', companyId: session?.user?.companyId ?? undefined })
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
                setForm((f) => ({ ...f, role: (opt?.value as TimeGateRole) ?? 'MANAGER' }))
              }
            />
          </FormField>
        </div>
      </FormCard>
    </form>
  )
}
