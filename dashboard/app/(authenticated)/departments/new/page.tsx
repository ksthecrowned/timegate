'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import NamedEntityForm from '@/components/timegate/NamedEntityForm'
import { createDepartment } from '@/lib/timegate/departments'

export default function NewDepartmentPage() {
  const router = useRouter()
  return (
    <div>
      <PageHeader breadcrumbs={[{ label: 'Départements', href: '/departments' }, { label: 'Ajouter' }]} />
      <NamedEntityForm
        title="Département"
        submitLabel="Créer"
        onCancel={() => router.push('/departments')}
        onSubmit={async (values) => {
          const row = await createDepartment(values)
          router.push(`/departments/${row.id}`)
        }}
      />
    </div>
  )
}

