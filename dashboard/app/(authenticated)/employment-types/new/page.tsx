'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import EmploymentTypeForm from '@/components/timegate/EmploymentTypeForm'
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
      <EmploymentTypeForm
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
