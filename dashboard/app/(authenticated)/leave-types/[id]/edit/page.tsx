'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import LeaveTypeForm from '@/components/timegate/LeaveTypeForm'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { getLeaveType, updateLeaveType } from '@/lib/timegate/leave-types'
import type { LeaveType } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function EditLeaveTypePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<LeaveType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void getLeaveType(id)
      .then(setRow)
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Type de congé introuvable.'))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Types de congé', href: '/leave-types' },
          { label: row?.name ?? 'Type', href: `/leave-types/${id}` },
          { label: 'Modifier' },
        ]}
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : row ? (
        <LeaveTypeForm
          initial={{
            name: row.name,
            isLwp: row.isLwp,
            isCarryForward: row.isCarryForward,
            maxDaysPerYear: row.maxDaysPerYear ?? null,
          }}
          submitLabel="Enregistrer"
          onCancel={() => router.push(`/leave-types/${id}`)}
          onSubmit={async (values) => {
            await updateLeaveType(id, values)
            router.push(`/leave-types/${id}`)
          }}
        />
      ) : null}
    </div>
  )
}
