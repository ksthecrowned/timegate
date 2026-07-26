'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import NamedEntityForm from '@/components/timegate/NamedEntityForm'
import { createEmploymentType } from '@/lib/timegate/employment-types'

export default function NewEmploymentTypePage() {
  const router = useRouter()
  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Types de contrat', href: '/employment-types' },
          { label: 'Ajouter' },
        ]}
      />
      <NamedEntityForm
        title="Type de contrat"
        submitLabel="Créer"
        onCancel={() => router.push('/employment-types')}
        onSubmit={async (values) => {
          const row = await createEmploymentType(values)
          router.push(`/employment-types/${row.id}`)
        }}
      />
    </div>
  )
}
