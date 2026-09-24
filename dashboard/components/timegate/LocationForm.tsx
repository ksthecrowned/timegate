'use client'

import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import { FormField, Input, SelectSearch, SwitcherField } from '@/components/ui/FormField'
import type { SelectOption } from '@/components/ui/select-search-types'
import { HttpError } from '@/lib/http'
import { findOption } from '@/lib/select-options'
import { listBranches } from '@/lib/timegate/branches'
import type { LocationPayload, TimeGateLocationType } from '@/lib/timegate/locations'
import { timezoneOptions } from '@/lib/timezones'
import { useEffect, useState } from 'react'

const TYPE_OPTIONS: SelectOption[] = [
  { value: 'CLIENT_SITE', label: 'Site client' },
  { value: 'BRANCH_SITE', label: 'Site branche' },
  { value: 'TEMPORARY', label: 'Temporaire' },
]

type LocationFormProps = {
  initial?: Partial<LocationPayload>
  submitLabel: string
  lockType?: boolean
  onSubmit: (values: LocationPayload) => Promise<void>
  onCancel?: () => void
}

const tzOptions = timezoneOptions()

export default function LocationForm({
  initial,
  submitLabel,
  lockType,
  onSubmit,
  onCancel,
}: LocationFormProps) {
  const [form, setForm] = useState<LocationPayload>({
    name: initial?.name ?? '',
    type: initial?.type ?? 'CLIENT_SITE',
    branchId: initial?.branchId ?? '',
    timeZone: initial?.timeZone ?? 'Africa/Brazzaville',
    address: initial?.address ?? '',
    clientLabel: initial?.clientLabel ?? '',
    latitude: initial?.latitude,
    longitude: initial?.longitude,
    checkinRadius: initial?.checkinRadius ?? undefined,
    isActive: initial?.isActive ?? true,
  })
  const [branchOptions, setBranchOptions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void listBranches({ page: 1, limit: 100 }).then((res) =>
      setBranchOptions(res.data.map((b) => ({ value: b.id, label: b.name }))),
    )
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        name: form.name.trim(),
        type: form.type,
        branchId: form.type === 'BRANCH_SITE' ? form.branchId || undefined : undefined,
        timeZone: form.timeZone?.trim() || undefined,
        address: form.address?.trim() || undefined,
        clientLabel: form.clientLabel?.trim() || undefined,
        latitude: form.latitude,
        longitude: form.longitude,
        checkinRadius: form.checkinRadius,
        isActive: form.isActive,
      })
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Enregistrement impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <FormCard title="Lieu de pointage">
      {error && <ApiErrorBanner message={error} />}
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField label="Nom" required>
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </FormField>

        <FormField label="Type">
          <SelectSearch
            instanceId="location-type"
            options={TYPE_OPTIONS}
            isDisabled={lockType}
            value={findOption(TYPE_OPTIONS, form.type ?? 'CLIENT_SITE')}
            onChange={(opt) =>
              setForm((f) => ({
                ...f,
                type: (opt?.value as TimeGateLocationType) ?? 'CLIENT_SITE',
              }))
            }
          />
        </FormField>

        {form.type === 'BRANCH_SITE' && (
          <FormField label="Branche liée" required>
            <SelectSearch
              instanceId="location-branch"
              options={branchOptions}
              value={findOption(branchOptions, form.branchId ?? '')}
              onChange={(opt) => setForm((f) => ({ ...f, branchId: opt?.value ?? '' }))}
            />
          </FormField>
        )}

        {form.type === 'CLIENT_SITE' && (
          <FormField label="Libellé client">
            <Input
              value={form.clientLabel ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, clientLabel: e.target.value }))}
              placeholder="Ex. Chantier ACME"
            />
          </FormField>
        )}

        <FormField label="Fuseau horaire">
          <SelectSearch
            instanceId="location-timezone"
            options={tzOptions}
            value={findOption(tzOptions, form.timeZone ?? 'Africa/Brazzaville')}
            onChange={(opt) =>
              setForm((f) => ({ ...f, timeZone: opt?.value ?? 'Africa/Brazzaville' }))
            }
          />
        </FormField>

        <FormField label="Adresse">
          <Input
            value={form.address ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
          />
        </FormField>

        <div className="grid md:grid-cols-3 gap-4">
          <FormField label="Latitude">
            <Input
              type="number"
              step="any"
              value={form.latitude ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  latitude: e.target.value === '' ? undefined : Number(e.target.value),
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
                  longitude: e.target.value === '' ? undefined : Number(e.target.value),
                }))
              }
            />
          </FormField>
          <FormField label="Rayon (m)">
            <Input
              type="number"
              value={form.checkinRadius ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  checkinRadius: e.target.value === '' ? undefined : Number(e.target.value),
                }))
              }
            />
          </FormField>
        </div>

        <SwitcherField
          label="Actif"
          checked={form.isActive ?? true}
          onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
        />

        <div className="flex justify-end gap-3 pt-2">
          {onCancel && (
            <button type="button" className={secondaryBtnClass} onClick={onCancel}>
              Annuler
            </button>
          )}
          <button type="submit" disabled={loading} className={primaryBtnClass}>
            {loading ? 'Enregistrement…' : submitLabel}
          </button>
        </div>
      </form>
    </FormCard>
  )
}
