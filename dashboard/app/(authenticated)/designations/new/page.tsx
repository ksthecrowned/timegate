'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import NamedEntityForm from '@/components/timegate/NamedEntityForm'
import { createDesignation } from '@/lib/timegate/designations'

export default function NewDesignationPage() {
  const router = useRouter()
  return (
    <div>
      <PageHeader breadcrumbs={[{ label: 'Postes', href: '/designations' }, { label: 'Ajouter' }]} />
      <NamedEntityForm
        title="Poste"
        submitLabel="Créer"
        onCancel={() => router.push('/designations')}
        onSubmit={async (values) => {
          const row = await createDesignation(values)
          router.push(`/designations/${row.id}`)
        }}
      />
    </div>
  )
}

