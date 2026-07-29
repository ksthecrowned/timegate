'use client'

import { useOrganization } from '@/components/providers/OrganizationProvider'
import { ApiErrorBanner, FormCard, primaryBtnClass } from '@/components/timegate/ui'
import { FormField, Input, SelectSearch } from '@/components/ui/FormField'
import PhoneInput from '@/components/ui/PhoneInput'
import PageHeader from '@/components/ui/PageHeader'
import { HttpError } from '@/lib/http'
import { findOption } from '@/lib/select-options'
import {
  updateMyCompany,
  uploadCompanyLogo,
  type CompanyProfilePayload,
} from '@/lib/timegate/company'
import { emitOrgSaved } from '@/lib/tour/events'
import { timezoneOptions } from '@/lib/timezones'
import Image from 'next/image'
import { useEffect, useState } from 'react'

export default function OrganizationSettingsPage() {
  const { company, reload } = useOrganization()
  const [form, setForm] = useState<CompanyProfilePayload>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!company) return
    setForm({
      name: company.name ?? '',
      abbr: company.abbr ?? '',
      timeZone: company.timeZone ?? 'Africa/Brazzaville',
      logoUrl: company.logoUrl ?? '',
      phone: company.phone ?? '',
      email: company.email ?? '',
      website: company.website ?? '',
      address: company.address ?? '',
    })
  }, [company])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await updateMyCompany(form)
      await reload()
      setSuccess('Configuration enregistrée.')
      emitOrgSaved()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible')
    } finally {
      setSaving(false)
    }
  }

  async function handleLogoUpload(file: File | null) {
    if (!file) return
    setUploading(true)
    setError('')
    setSuccess('')
    try {
      const updated = await uploadCompanyLogo(file)
      setForm((prev) => ({ ...prev, logoUrl: updated.logoUrl ?? '' }))
      await reload()
      setSuccess('Logo mis à jour.')
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Téléversement impossible')
    } finally {
      setUploading(false)
    }
  }

  const tzOptions = timezoneOptions()

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: 'Configuration organisation' }]} />

      {error && <ApiErrorBanner message={error} />}
      {success && (
        <div className="my-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300">
          {success}
        </div>
      )}

      <FormCard title="Identité de l'organisation">
        <form data-tour="org-form" onSubmit={handleSave} className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="shrink-0">
              <p className="text-sm font-medium text-gray-700 dark:text-neutral-300 mb-2">Logo</p>
              <div className="flex h-24 w-48 items-center justify-center rounded-xl border border-slate-200/80 dark:border-border-dark border-dashed tb-card p-2">
                {form.logoUrl ? (
                  <Image
                    src={form.logoUrl}
                    alt={form.name ?? 'Logo organisation'}
                    width={180}
                    height={72}
                    unoptimized={form.logoUrl.startsWith('http')}
                    className="max-h-20 w-auto object-contain"
                  />
                ) : (
                  <span className="text-xs text-gray-400">Aucun logo</span>
                )}
              </div>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm text-primary hover:underline">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => void handleLogoUpload(e.target.files?.[0] ?? null)}
                />
                {uploading ? 'Téléversement…' : 'Changer le logo'}
              </label>
            </div>

            <div className="grid flex-1 md:grid-cols-2 gap-4 w-full">
              <FormField label="Nom">
                <Input
                  value={form.name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </FormField>
              <FormField label="Sigle">
                <Input
                  value={form.abbr ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, abbr: e.target.value }))}
                />
              </FormField>
              <FormField label="SKU">
                <Input value={company?.sku ?? ''} readOnly />
              </FormField>
              <FormField label="Fuseau horaire">
                <SelectSearch
                  instanceId="branch-timezone"
                  options={tzOptions}
                  value={findOption(tzOptions, form.timeZone ?? 'Africa/Brazzaville')}
                  onChange={(opt) => setForm((f) => ({ ...f, timezone: opt?.value ?? 'Africa/Brazzaville' }))}
                />
              </FormField>
              <FormField label="Téléphone">
                <PhoneInput
                  value={form.phone ?? ''}
                  onChange={(next) => setForm((f) => ({ ...f, phone: next }))}
                  organizationCountryIsoCode={(company as { countryIsoCode?: string | null } | null)?.countryIsoCode}
                />
              </FormField>
              <FormField label="Email">
                <Input
                  type="email"
                  value={form.email ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </FormField>
              <div className="md:col-span-2">
                <FormField label="Site web">
                  <Input
                    value={form.website ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                    placeholder="https://www.exemple.cg"
                  />
                </FormField>
              </div>
              <div className="md:col-span-2">
                <FormField label="Adresse">
                  <Input
                    value={form.address ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  />
                </FormField>
              </div>
              <div className="md:col-span-2">
                <FormField label="URL du logo (alternative)">
                  <Input
                    value={form.logoUrl ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                    placeholder="/images/orgs/mon-logo.svg"
                  />
                </FormField>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className={primaryBtnClass}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </FormCard>
    </div>
  )
}
