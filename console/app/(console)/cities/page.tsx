'use client'

import DataTable, { Column } from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import { listCities } from '@/lib/api/saas'
import type { City } from '@/lib/api/types'
import { HttpError } from '@/lib/http'
import { useCallback, useEffect, useState } from 'react'

const columns: Column<City>[] = [
  { key: 'name', label: 'Ville', sortable: true },
  {
    key: 'country',
    label: 'Pays',
    render: (_, row) =>
      row.country ? `${row.country.name} (${row.country.isoCode})` : row.countryId,
  },
]

export default function CitiesPage() {
  const [data, setData] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData((await listCities({ limit: 100 })).data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <PageHeader breadcrumbs={[{ label: 'Villes' }]} />
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        entityLabel="villes"
        tableId="hs-cities-table"
        emptyMessage="Aucune ville enregistrée."
      />
    </div>
  )
}
