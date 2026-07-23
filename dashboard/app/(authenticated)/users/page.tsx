'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import DataTable, { type Column } from '@/components/ui/DataTable'
import { listAdminUsers, type AdminUser } from '@/lib/timegate/auth-admin'
import { getRoleLabel } from '@/lib/timegate/roles'
import { HttpError } from '@/lib/http'

function RoleBadge({ role }: { role: string }) {
  const className =
    role === 'ADMIN'
      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
      : role === 'MANAGER'
        ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {getRoleLabel(role)}
    </span>
  )
}

const columns: Column<AdminUser>[] = [
  { key: 'email', label: 'Email', sortable: true },
  {
    key: 'role',
    label: 'Rôle',
    sortable: true,
    render: (v) => <RoleBadge role={String(v)} />,
  },
  {
    key: 'employee',
    label: 'Employé lié',
    sortable: true,
    render: (_v, row) => {
      if (!row.employee) {
        return <span className="text-slate-400 dark:text-slate-500">—</span>
      }
      return (
        <Link
          href={`/employees/${row.employee.id}`}
          className="text-primary hover:underline font-medium"
          onClick={(e) => e.stopPropagation()}
        >
          {row.employee.name}
        </Link>
      )
    },
  },
  {
    key: 'createdAt',
    label: 'Créé le',
    sortable: true,
    render: (v) => new Date(String(v)).toLocaleDateString('fr-FR'),
  },
]

export default function AdminsPage() {
  const [data, setData] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await listAdminUsers())
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
        breadcrumbs={[{ label: 'Administration' }, { label: 'Utilisateurs' }]}
        action={
          <Link
            href="/users/new"
            className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-primary text-white hover:bg-secondary"
          >
            Ajouter admin / manager
          </Link>
        }
      />
      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <DataTable
        loading={loading}
        data={data}
        columns={columns}
        entityLabel="utilisateurs"
        tableId="hs-admin-users-table"
        emptyMessage="Aucun utilisateur trouvé."
      />
    </div>
  )
}
