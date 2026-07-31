'use client'

import AddPageLink from '@/components/timegate/AddPageLink'
import { dateTableColumn } from '@/components/timegate/date-table-column'
import { ApiErrorBanner } from '@/components/timegate/ui'
import ActionButtons from '@/components/ui/ActionButtons'
import DataTable, { Column } from '@/components/ui/DataTable'
import PageHeader from '@/components/ui/PageHeader'
import { HttpError } from '@/lib/http'
import { deleteCompensationGrid, listCompensationGrid } from '@/lib/timegate/compensation-grid'
import { listDesignations, listEmploymentTypes } from '@/lib/timegate/refs'
import type { CompensationGridEntry } from '@/lib/timegate/types'
import { formatMoney } from '@/lib/money'
import { useCallback, useEffect, useMemo, useState } from 'react'

export default function CompensationGridPage() {
  const [data, setData] = useState<CompensationGridEntry[]>([])
  const [designationNames, setDesignationNames] = useState<Record<string, string>>({})
  const [employmentTypeNames, setEmploymentTypeNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [entries, designations, employmentTypes] = await Promise.all([
        listCompensationGrid({ page: 1, limit: 100 }),
        listDesignations(),
        listEmploymentTypes(),
      ])
      setData(entries.data)
      setDesignationNames(Object.fromEntries(designations.data.map((d) => [d.id, d.name])))
      setEmploymentTypeNames(Object.fromEntries(employmentTypes.data.map((t) => [t.id, t.name])))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const columns: Column<CompensationGridEntry>[] = useMemo(
    () => [
      {
        key: 'designationId',
        label: 'Poste',
        sortable: true,
        render: (_, row) => designationNames[row.designationId] ?? '—',
      },
      {
        key: 'employmentTypeId',
        label: 'Type contrat',
        sortable: true,
        render: (_, row) => employmentTypeNames[row.employmentTypeId] ?? '—',
      },
      {
        key: 'baseSalary',
        label: 'Salaire de base',
        render: (_, row) => formatMoney(row.baseSalary),
      },
      dateTableColumn<CompensationGridEntry>('effectiveFrom', 'Effectif depuis', { sortable: true }),
      dateTableColumn<CompensationGridEntry>('effectiveTo', 'Effectif jusqu\'au'),
    ],
    [designationNames, employmentTypeNames],
  )

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Grille salariale' }]}
        action={<AddPageLink href="/compensation-grid/new" label="Nouvelle entrée" />}
      />
      <ApiErrorBanner message={error} />
      <DataTable
        loading={loading}
        data={data}
        columns={columns}
        entityLabel="entrées"
        tableId="hs-compensation-grid-table"
        emptyMessage="Aucune entrée trouvée."
        actions={(row) => (
          <ActionButtons
            editHref={`/compensation-grid/${row.id}/edit`}
            onDelete={() => {
              void deleteCompensationGrid(row.id).then(load)
            }}
          />
        )}
      />
    </div>
  )
}
