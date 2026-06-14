'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import CityForm from '@/components/timegate/CityForm'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { getCity, updateCity } from '@/lib/timegate/cities'
import type { City } from '@/lib/timegate/cities'
import { HttpError } from '@/lib/http'

export default function EditCityPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<City | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void getCity(id)
      .then(setRow)
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Ville introuvable.'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Plateforme' },
          { label: 'Villes', href: '/cities' },
          { label: row?.name ?? 'Ville', href: `/cities/${id}` },
          { label: 'Modifier' },
        ]}
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : row ? (
        <CityForm
          initial={{
            name: row.name,
            countryId: row.countryId,
            latitude: row.latitude ?? undefined,
            longitude: row.longitude ?? undefined,
          }}
          submitLabel="Enregistrer"
          onCancel={() => router.push(`/cities/${id}`)}
          onSubmit={async (values) => {
            await updateCity(id, values)
            router.push(`/cities/${id}`)
          }}
        />
      ) : null}
    </div>
  )
}
