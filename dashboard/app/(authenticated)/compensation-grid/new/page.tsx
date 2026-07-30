'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import CompensationGridForm from '@/components/timegate/CompensationGridForm'
import { createCompensationGrid } from '@/lib/timegate/compensation-grid'

export default function NewCompensationGridPage() {
  const router = useRouter()
  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Grille salariale', href: '/compensation-grid' },
          { label: 'Ajouter' },
        ]}
      />
      <CompensationGridForm
        submitLabel="Créer"
        onCancel={() => router.push('/compensation-grid')}
        onSubmit={async (values) => {
          await createCompensationGrid(values)
          router.push('/compensation-grid')
        }}
      />
    </div>
  )
}
