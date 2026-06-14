'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import AdminUserForm from '@/components/timegate/AdminUserForm'
import DataTable, { type Column } from '@/components/ui/DataTable'
import { listAdminUsers, type AdminUser } from '@/lib/timegate/auth-admin'
import { HttpError } from '@/lib/http'

const columns: Column<AdminUser>[] = [
  { key: 'email', label: 'Email', sortable: true },
  { key: 'role', label: 'Role', sortable: true },
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
            href="/admins/new"
            className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-transparent bg-primary text-white hover:bg-secondary"
          >
            Ajouter
          </Link>
        }
      />
      {error && <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="mb-6">
        <DataTable
          loading={loading}
          data={data}
          columns={columns}
          entityLabel="administrateurs"
          tableId="hs-admin-users-table"
          emptyMessage="Aucun compte admin/manager trouvé."
        />
      </div>
      <AdminUserForm />
    </div>
  )
}
