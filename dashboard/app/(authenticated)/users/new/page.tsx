'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import AdminUserForm from '@/components/timegate/AdminUserForm'

export default function NewAdminPage() {
  const router = useRouter()

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Administration', href: '/admins' },
          { label: 'Utilisateurs', href: '/users' },
          { label: 'Ajouter' },
        ]}
      />
      <AdminUserForm onCancel={() => router.push('/users')} />
    </div>
  )
}
