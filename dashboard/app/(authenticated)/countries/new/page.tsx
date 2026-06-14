'use client'

import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import CountryForm from '@/components/timegate/CountryForm'
import { createCountry } from '@/lib/timegate/countries'

export default function NewCountryPage() {
  const router = useRouter()

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Plateforme' },
          { label: 'Pays', href: '/countries' },
          { label: 'Ajouter' },
        ]}
      />
      <CountryForm
        submitLabel="Créer le pays"
        onCancel={() => router.push('/countries')}
        onSubmit={async (values) => {
          const row = await createCountry(values)
          router.push(`/countries/${row.id}`)
        }}
      />
    </div>
  )
}
