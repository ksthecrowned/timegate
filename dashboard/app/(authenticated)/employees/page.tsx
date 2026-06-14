'use client'

import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { Column } from '@/components/ui/DataTable'
import StatusBadge from '@/components/ui/StatusBadge'
import ActionButtons from '@/components/ui/ActionButtons'
import Link from 'next/link'
import AddPageLink from '@/components/timegate/AddPageLink'
import { secondaryBtnClass } from '@/components/timegate/ui'
import EmployeeTableCell from '@/components/timegate/EmployeeTableCell'
import { deleteEmployee, listEmployees, updateEmployee } from '@/lib/timegate/employees'
import type { Employee } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

const columns: Column<Employee>[] = [
  {
    key: 'name',
    label: 'Employé',
    sortable: true,
    render: (_, row) => <EmployeeTableCell employee={row} />,
  },
  { key: 'email', label: 'Email', sortable: true },
  {
    key: 'branch',
    label: 'Branche',
    render: (_, row) => row.branch?.name ?? '—',
  },
  {
    key: 'department',
    label: 'Département',
    filterable: true,
    filterPlaceholder: 'département',
  },
  {
    key: 'status',
    label: 'Statut',
    render: (_, row) => (
      <StatusBadge status={row.isActive ? 'active' : 'inactive'} />
    ),
  },
  {
    key: 'hasFaceEmbedding',
    label: 'Visage',
    render: (_, row) => (row.hasFaceEmbedding ? 'Enregistré' : '—'),
  },
]

export default function EmployeesPage() {
  const [data, setData] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listEmployees({ page: 1, limit: 100 })
      setData(res.data)
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
      <PageHeader
        breadcrumbs={[{ label: 'Employés' }]}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/employees/import" className={secondaryBtnClass}>
              Importer CSV
            </Link>
            <AddPageLink href="/employees/new" label="Ajouter un employé" />
          </div>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      <DataTable
          loading={loading}
          data={data}
          columns={columns}
          entityLabel="employés"
          tableId="hs-employees-table"
          emptyMessage="Aucun employé trouvé."
          actions={(row) => (
            <ActionButtons
              viewHref={`/employees/${row.id}`}
              editHref={`/employees/${row.id}/edit`}
              mailTo={row.email ?? undefined}
              isActive={row.isActive}
              onToggleStatus={() => {
                void updateEmployee(row.id, { isActive: !row.isActive }).then(load)
              }}
              onDelete={() => {
                void deleteEmployee(row.id).then(load)
              }}
              deleteMessage="Cet employé sera définitivement supprimé."
            />
          )}
        />
    </div>
  )
}
