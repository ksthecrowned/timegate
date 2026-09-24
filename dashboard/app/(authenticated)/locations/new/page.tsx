'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import LocationForm from '@/components/timegate/LocationForm'
import { createLocation } from '@/lib/timegate/locations'
import { primaryBtnClass } from '@/components/timegate/ui'

export default function NewLocationPage() {
  const router = useRouter()

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Lieux de pointage', href: '/locations' },
          { label: 'Ajouter' },
        ]}
        action={
          <Link href="/locations" className={primaryBtnClass}>
            Retour à la liste
          </Link>
        }
      />
      <LocationForm
        submitLabel="Créer le lieu"
        onCancel={() => router.push('/locations')}
        onSubmit={async (values) => {
          const location = await createLocation(values)
          router.push(`/locations/${location.id}`)
        }}
      />
    </div>
  )
}
