'use client'

import AddPageLink from '@/components/timegate/AddPageLink'
import ActionButtons from '@/components/ui/ActionButtons'
import DataTable, { Column } from '@/components/ui/DataTable'
import { SelectSearch } from '@/components/ui/FormField'
import PageHeader from '@/components/ui/PageHeader'
import type { SelectOption } from '@/components/ui/select-search-types'
import { HttpError } from '@/lib/http'
import { findOption } from '@/lib/select-options'
import { deleteCity, listCities, type City } from '@/lib/timegate/cities'
import { listCountries } from '@/lib/timegate/countries'
import { useCallback, useEffect, useState } from 'react'

const columns: Column<City>[] = [
  { key: 'name', label: 'Ville', sortable: true },
  {
    key: 'country',
    label: 'Pays',
    render: (_, row) => row.country?.name ?? '—',
  },
  {
    key: 'latitude',
    label: 'Latitude',
    render: (v) => (v != null ? String(v) : '—'),
  },
  {
    key: 'longitude',
    label: 'Longitude',
    render: (v) => (v != null ? String(v) : '—'),
  },
]

export default function CitiesPage() {
  const [data, setData] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [countryOptions, setCountryOptions] = useState<SelectOption[]>([])
  const [countryFilter, setCountryFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listCities({
        limit: 500,
        ...(countryFilter ? { countryId: countryFilter } : {}),
      })
      setData(res.data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [countryFilter])

  useEffect(() => {
    void listCountries({ limit: 100 }).then((res) =>
      setCountryOptions([
        { value: '', label: 'Tous les pays' },
        ...res.data.map((c) => ({ value: c.id, label: `${c.name} (${c.isoCode})` })),
      ]),
    )
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Plateforme' }, { label: 'Villes' }]}
        action={<AddPageLink href="/cities/new" label="Ajouter une ville" />}
      />
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}
      <div className="mb-4 max-w-sm">
        <SelectSearch
          options={countryOptions}
          value={findOption(countryOptions, countryFilter)}
          onChange={(opt) => setCountryFilter(opt?.value ?? '')}
          placeholder="Filtrer par pays"
        />
      </div>
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        entityLabel="villes"
        tableId="hs-cities-table"
        emptyMessage="Aucune ville enregistrée."
        actions={(row) => (
          <ActionButtons
            viewHref={`/cities/${row.id}`}
            editHref={`/cities/${row.id}/edit`}
            onDelete={() => void deleteCity(row.id).then(() => load())}
            deleteMessage={`Supprimer la ville « ${row.name} » ?`}
          />
        )}
      />
    </div>
  )
}
