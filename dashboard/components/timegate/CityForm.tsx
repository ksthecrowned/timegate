'use client'

import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import { FormField, Input, SelectSearch } from '@/components/ui/FormField'
import type { SelectOption } from '@/components/ui/select-search-types'
import { HttpError } from '@/lib/http'
import { findOption } from '@/lib/select-options'
import type { CityPayload } from '@/lib/timegate/cities'
import { listCountries } from '@/lib/timegate/countries'
import { useEffect, useState } from 'react'

type CityFormProps = {
  initial?: Partial<CityPayload>
  submitLabel: string
  onSubmit: (values: CityPayload) => Promise<void>
  onCancel?: () => void
}

export default function CityForm({ initial, submitLabel, onSubmit, onCancel }: CityFormProps) {
  const [form, setForm] = useState<CityPayload>({
    name: initial?.name ?? '',
    countryId: initial?.countryId ?? '',
    latitude: initial?.latitude,
    longitude: initial?.longitude,
  })
  const [countryOptions, setCountryOptions] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void listCountries({ limit: 100 }).then((res) =>
      setCountryOptions(res.data.map((c) => ({ value: c.id, label: `${c.name} (${c.isoCode})` }))),
    )
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await onSubmit({
        name: form.name.trim(),
        countryId: form.countryId,
        latitude: form.latitude,
        longitude: form.longitude,
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
        title="Ville"
        footer={
          <>
            {onCancel && (
              <button type="button" onClick={onCancel} className={secondaryBtnClass}>
                Annuler
              </button>
            )}
            <button type="submit" disabled={loading || !form.countryId} className={primaryBtnClass}>
              {loading ? 'Enregistrement…' : submitLabel}
            </button>
          </>
        }
      >
        <ApiErrorBanner message={error} />
        <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
          <FormField label="Pays" required>
            <SelectSearch
              options={countryOptions}
              value={findOption(countryOptions, form.countryId)}
              onChange={(opt) => setForm((f) => ({ ...f, countryId: opt?.value ?? '' }))}
              placeholder="Sélectionner un pays"
            />
          </FormField>
          <FormField label="Nom de la ville" required>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Brazzaville"
              required
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
                  latitude: e.target.value === '' ? undefined : Number(e.target.value),
                }))
              }
              placeholder="-4.2634"
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
              placeholder="15.2429"
            />
          </FormField>
        </div>
      </FormCard>
    </form>
  )
}
