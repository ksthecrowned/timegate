'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import LateRecordForm from '@/components/timegate/LateRecordForm'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { getLateRecord, updateLateRecord } from '@/lib/timegate/late-records'
import type { LateRecord } from '@/lib/timegate/types'
import { formatApiDate } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'

export default function EditLateRecordPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [row, setRow] = useState<LateRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void getLateRecord(params.id)
      .then((found) => {
        if (!found) setError('Retard introuvable.')
        else setRow(found)
      })
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [params.id])

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Retards', href: '/late-records' },
          { label: row ? formatApiDate(row.date) : 'Modifier' },
        ]}
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : row ? (
        <LateRecordForm
          submitLabel="Enregistrer"
          initial={{
            employeeId: row.employeeId,
            date: row.date,
            latenessMinutes: row.latenessMinutes,
            justified: row.justified,
            reason: row.reason ?? '',
            justificationFileUrl: row.justificationFileUrl ?? '',
          }}
          onCancel={() => router.push('/late-records')}
          onSubmit={async (values) => {
            await updateLateRecord(params.id, values)
            router.push('/late-records')
          }}
        />
      ) : null}
    </div>
  )
}
