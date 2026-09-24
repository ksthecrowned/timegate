'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import LocationForm from '@/components/timegate/LocationForm'
import {
  getLocation,
  updateLocation,
  type TimeGateLocation,
} from '@/lib/timegate/locations'
import { HttpError } from '@/lib/http'
import { primaryBtnClass } from '@/components/timegate/ui'

export default function EditLocationPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [location, setLocation] = useState<TimeGateLocation | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void getLocation(params.id)
      .then(setLocation)
      .catch((err) =>
        setError(err instanceof HttpError ? err.message : 'Lieu introuvable'),
      )
  }, [params.id])

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Lieux de pointage', href: '/locations' },
          { label: location?.name ?? 'Modifier' },
        ]}
        action={
          <Link href={`/locations/${params.id}`} className={primaryBtnClass}>
            Retour
          </Link>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {location && (
        <LocationForm
          lockType
          initial={{
            name: location.name,
            type: location.type,
            branchId: location.branchId ?? undefined,
            timeZone: location.timeZone ?? undefined,
            address: location.address ?? undefined,
            clientLabel: location.clientLabel ?? undefined,
            latitude: location.latitude ?? undefined,
            longitude: location.longitude ?? undefined,
            checkinRadius: location.checkinRadius ?? undefined,
            isActive: location.isActive,
          }}
          submitLabel="Enregistrer"
          onCancel={() => router.push(`/locations/${params.id}`)}
          onSubmit={async (values) => {
            await updateLocation(params.id, values)
            router.push(`/locations/${params.id}`)
          }}
        />
      )}
    </div>
  )
}
