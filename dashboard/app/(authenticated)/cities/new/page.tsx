'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import CityForm from '@/components/timegate/CityForm'
import { createCity } from '@/lib/timegate/cities'

export default function NewCityPage() {
  const router = useRouter()

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Plateforme' },
          { label: 'Villes', href: '/cities' },
          { label: 'Ajouter' },
        ]}
      />
      <CityForm
        submitLabel="Créer la ville"
        onCancel={() => router.push('/cities')}
        onSubmit={async (values) => {
          const row = await createCity(values)
          router.push(`/cities/${row.id}`)
        }}
      />
    </div>
  )
}
