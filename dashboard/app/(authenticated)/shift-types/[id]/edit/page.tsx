'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import ShiftTypeForm from '@/components/timegate/ShiftTypeForm'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { getShiftType, updateShiftType } from '@/lib/timegate/shift-types'
import type { ShiftType } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function EditShiftTypePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<ShiftType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void getShiftType(id)
      .then(setRow)
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Horaire introuvable.'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Horaires', href: '/shift-types' },
          { label: row?.name ?? 'Horaire', href: `/shift-types/${id}` },
          { label: 'Modifier' },
        ]}
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : row ? (
        <ShiftTypeForm
          submitLabel="Enregistrer"
          initial={{
            branchId: row.branchId,
            name: row.name,
            startTime: row.startTime,
            endTime: row.endTime,
            lateGraceMinutes: row.lateGraceMinutes ?? undefined,
            checkInWindowStart: row.checkInWindowStart ?? undefined,
            checkInWindowEnd: row.checkInWindowEnd ?? undefined,
            checkOutWindowStart: row.checkOutWindowStart ?? undefined,
            checkOutWindowEnd: row.checkOutWindowEnd ?? undefined,
            breakWindowStart: row.breakWindowStart ?? undefined,
            breakWindowEnd: row.breakWindowEnd ?? undefined,
            breakDurationMinutes: row.breakDurationMinutes ?? undefined,
          }}
          onCancel={() => router.push(`/shift-types/${id}`)}
          onSubmit={async (values) => {
            await updateShiftType(id, values)
            router.push(`/shift-types/${id}`)
          }}
        />
      ) : null}
    </div>
  )
}
