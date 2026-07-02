'use client'

import DataTable, { Column } from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import { listCountries } from '@/lib/api/saas'
import type { Country } from '@/lib/api/types'
import { HttpError } from '@/lib/http'
import { useCallback, useEffect, useState } from 'react'

const columns: Column<Country>[] = [
  { key: 'name', label: 'Pays', sortable: true },
  { key: 'isoCode', label: 'Code ISO', sortable: true },
  { key: 'phoneCode', label: 'Indicatif', render: (v) => String(v ?? '—') },
]

export default function CountriesPage() {
  const [data, setData] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData((await listCountries({ limit: 100 })).data)
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
      <PageHeader breadcrumbs={[{ label: 'Pays' }]} />
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        entityLabel="pays"
        tableId="hs-countries-table"
        emptyMessage="Aucun pays enregistré."
      />
    </div>
  )
}
