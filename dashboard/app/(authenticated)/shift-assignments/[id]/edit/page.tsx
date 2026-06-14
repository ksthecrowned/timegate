'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import ShiftAssignmentForm from '@/components/timegate/ShiftAssignmentForm'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { getShiftAssignment, updateShiftAssignment } from '@/lib/timegate/shift-assignments'
import type { ShiftAssignment } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function EditShiftAssignmentPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<ShiftAssignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void getShiftAssignment(id)
      .then(setRow)
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Affectation introuvable.'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Affectations horaires', href: '/shift-assignments' },
          { label: 'Affectation', href: `/shift-assignments/${id}` },
          { label: 'Modifier' },
        ]}
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : row ? (
        <ShiftAssignmentForm
          submitLabel="Enregistrer"
          initial={{
            employeeId: row.employeeId,
            shiftTypeId: row.shiftTypeId,
            shiftLocationId: row.shiftLocationId ?? '',
            startDate: row.startDate ?? '',
            endDate: row.endDate ?? '',
          }}
          onCancel={() => router.push(`/shift-assignments/${id}`)}
          onSubmit={async (values) => {
            await updateShiftAssignment(id, values)
            router.push(`/shift-assignments/${id}`)
          }}
        />
      ) : null}
    </div>
  )
}
