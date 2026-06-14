'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import KioskForm from '@/components/timegate/KioskForm'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { getKiosk, updateKiosk } from '@/lib/timegate/kiosks'
import type { Kiosk } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function EditKioskPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [kiosk, setKiosk] = useState<Kiosk | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      try {
        setKiosk(await getKiosk(id))
      } catch (err) {
        setError(err instanceof HttpError ? err.message : 'Kiosque introuvable.')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Kiosques', href: '/kiosks' },
          { label: kiosk?.name ?? 'Kiosque', href: `/kiosks/${id}` },
          { label: 'Modifier' },
        ]}
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : kiosk ? (
        <KioskForm
          submitLabel="Enregistrer"
          showActiveToggle
          onCancel={() => router.push(`/kiosks/${id}`)}
          initial={{
            name: kiosk.name,
            branchId: kiosk.branchId,
            shiftLocationId: kiosk.shiftLocationId ?? '',
            isActive: kiosk.isActive,
          }}
          onSubmit={async (values) => {
            await updateKiosk(id, values)
            router.push(`/kiosks/${id}`)
          }}
        />
      ) : null}
    </div>
  )
}
