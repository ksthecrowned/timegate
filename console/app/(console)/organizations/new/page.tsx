'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { FormField, Input } from '@/components/ui/FormField'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import { createOrganization } from '@/lib/api/organizations'
import { HttpError } from '@/lib/http'

export default function NewOrganizationPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', sku: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const org = await createOrganization({
        name: form.name.trim(),
        sku: form.sku.trim().toUpperCase(),
      })
      router.push(`/organizations/${org.id}`)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Création impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Organisations', href: '/organizations' },
          { label: 'Ajouter' },
        ]}
      />
      <form onSubmit={handleSubmit}>
        <FormCard
          title="Nouvelle organisation"
          footer={
            <>
              <Link href="/organizations" className={secondaryBtnClass}>
                Annuler
              </Link>
              <button type="submit" disabled={loading} className={primaryBtnClass}>
                {loading ? 'Création…' : 'Créer'}
              </button>
            </>
          }
        >
          <ApiErrorBanner message={error} />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Nom *">
              <Input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </FormField>
            <FormField label="SKU *">
              <Input
                required
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value.toUpperCase() }))}
                placeholder="TMGT"
              />
            </FormField>
          </div>
        </FormCard>
      </form>
    </div>
  )
}
