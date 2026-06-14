'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import LeaveForm from '@/components/timegate/LeaveForm'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { getLeave, updateLeave } from '@/lib/timegate/leaves'
import type { Leave } from '@/lib/timegate/types'
import { formatApiDate } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'

export default function EditLeavePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [row, setRow] = useState<Leave | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void getLeave(params.id)
      .then((found) => {
        if (!found) setError('Congé introuvable.')
        else setRow(found)
      })
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [params.id])

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Congés', href: '/leaves' },
          { label: row ? `${formatApiDate(row.startDate)} — ${formatApiDate(row.endDate)}` : 'Modifier' },
        ]}
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : row ? (
        <LeaveForm
          submitLabel="Enregistrer"
          initial={{
            employeeId: row.employeeId,
            startDate: row.startDate,
            endDate: row.endDate,
            reason: row.reason ?? '',
            status: row.status,
            leaveTypeId: row.leaveTypeId ?? '',
          }}
          onCancel={() => router.push('/leaves')}
          onSubmit={async (values) => {
            await updateLeave(params.id, values)
            router.push('/leaves')
          }}
        />
      ) : null}
    </div>
  )
}
