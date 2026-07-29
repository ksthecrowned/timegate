'use client'

import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import { FormField, Input, SelectSearch, SwitcherField } from '@/components/ui/FormField'
import PhoneInput from '@/components/ui/PhoneInput'
import type { SelectOption } from '@/components/ui/select-search-types'
import { useOrganization } from '@/components/providers/OrganizationProvider'
import { HttpError } from '@/lib/http'
import { findOption } from '@/lib/select-options'
import type { BranchPayload } from '@/lib/timegate/branches'
import { listCities } from '@/lib/timegate/cities'
import { listCountries } from '@/lib/timegate/countries'
import { timezoneOptions } from '@/lib/timezones'
import { useEffect, useState } from 'react'

type BranchFormProps = {
  initial?: Partial<BranchPayload>
  submitLabel: string
  onSubmit: (values: BranchPayload) => Promise<void>
  onCancel?: () => void
}

const tzOptions = timezoneOptions()

export default function BranchForm({ initial, submitLabel, onSubmit, onCancel }: BranchFormProps) {
  const { company } = useOrganization()
  const [form, setForm] = useState<BranchPayload>({
    name: initial?.name ?? '',
    branchCode: initial?.branchCode ?? '',
    address: initial?.address ?? '',
    timezone: initial?.timezone ?? 'Africa/Brazzaville',
    cityId: initial?.cityId ?? '',
    countryId: initial?.countryId ?? '',
    latitude: initial?.latitude,
    longitude: initial?.longitude,
    checkinRadius: initial?.checkinRadius ?? 100,
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    isHeadOffice: initial?.isHeadOffice ?? false,
    isActive: initial?.isActive ?? true,
  })
  const [countryOptions, setCountryOptions] = useState<SelectOption[]>([])
  const [countryMetaById, setCountryMetaById] = useState<Record<string, { isoCode: string; phoneCode?: string | null }>>({})
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void listCountries({ limit: 100 }).then((res) => {
      setCountryOptions(res.data.map((c) => ({ value: c.id, label: `${c.name} (${c.isoCode})` })))
      setCountryMetaById(
        Object.fromEntries(
          res.data.map((c) => [c.id, { isoCode: c.isoCode, phoneCode: c.phoneCode }]),
        ),
      )
    })
  }, [])

  useEffect(() => {
    if (!form.countryId) {
      setCityOptions([])
      return
    }
    void listCities({ countryId: form.countryId, limit: 100 }).then((res) =>
      setCityOptions(res.data.map((c) => ({ value: c.id, label: c.name }))),
    )
  }, [form.countryId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        name: form.name.trim(),
        branchCode: form.branchCode?.trim() || undefined,
        address: form.address?.trim() || undefined,
        timezone: form.timezone?.trim() || undefined,
        cityId: form.cityId || undefined,
        countryId: form.countryId || undefined,
        latitude: form.latitude,
        longitude: form.longitude,
        checkinRadius: form.checkinRadius,
        phone: form.phone?.trim() || undefined,
        email: form.email?.trim() || undefined,
        isHeadOffice: form.isHeadOffice,
        isActive: form.isActive,
      })
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FormCard
        title="Branche"
        footer={
          <>
            {onCancel && (
              <button type="button" onClick={onCancel} className={secondaryBtnClass}>
                Annuler
              </button>
            )}
            <button type="submit" disabled={loading} className={primaryBtnClass}>
              {loading ? 'Enregistrement…' : submitLabel}
            </button>
          </>
        }
      >
        <ApiErrorBanner message={error} />
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Nom *">
            <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Code branche">
            <Input
              value={form.branchCode ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, branchCode: e.target.value }))}
              placeholder="KIN-01"
            />
          </FormField>
          <FormField label="Pays">
            <SelectSearch
              instanceId="branch-country"
              options={countryOptions}
              value={findOption(countryOptions, form.countryId ?? '')}
              onChange={(opt) =>
                setForm((f) => ({ ...f, countryId: opt?.value ?? '', cityId: '' }))
              }
              placeholder="Sélectionner un pays"
              isClearable
            />
          </FormField>
          <FormField label="Ville">
            <SelectSearch
              instanceId="branch-city"
              options={cityOptions}
              value={findOption(cityOptions, form.cityId ?? '')}
              onChange={(opt) => setForm((f) => ({ ...f, cityId: opt?.value ?? '' }))}
              placeholder={form.countryId ? 'Sélectionner une ville' : 'Choisir un pays d’abord'}
              isDisabled={!form.countryId}
              isClearable
            />
          </FormField>
          <FormField label="Fuseau horaire">
            <SelectSearch
              instanceId="branch-timezone"
              options={tzOptions}
              value={findOption(tzOptions, form.timezone ?? 'Africa/Brazzaville')}
              onChange={(opt) => setForm((f) => ({ ...f, timezone: opt?.value ?? 'Africa/Brazzaville' }))}
            />
          </FormField>
          <FormField label="Rayon pointage (m)">
            <Input
              type="number"
              min={0}
              value={form.checkinRadius ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  checkinRadius: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </FormField>
          <FormField label="Latitude">
            <Input
              type="number"
              step="any"
              value={form.latitude ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  latitude: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </FormField>
          <FormField label="Longitude">
            <Input
              type="number"
              step="any"
              value={form.longitude ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  longitude: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </FormField>
          <FormField label="Téléphone">
            <PhoneInput
              value={form.phone ?? ''}
              onChange={(next) => setForm((f) => ({ ...f, phone: next }))}
              countryIsoCode={countryMetaById[form.countryId ?? '']?.isoCode}
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
            <FormField label="Adresse">
              <Input
                value={form.address ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </FormField>
          </div>
          <SwitcherField
            label="Siège social"
            checked={form.isHeadOffice ?? false}
            onCheckedChange={(checked) => setForm((f) => ({ ...f, isHeadOffice: checked }))}
          />
          <SwitcherField
            label="Branche active"
            checked={form.isActive ?? true}
            onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
          />
        </div>
      </FormCard>
    </form>
  )
}
