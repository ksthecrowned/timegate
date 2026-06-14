'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import WorkDayForm from '@/components/timegate/WorkDayForm'
import { ApiErrorBanner } from '@/components/timegate/ui'
import { getWorkDay, updateWorkDay, WEEK_DAY_LABELS } from '@/lib/timegate/work-days'
import type { WorkDay } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function EditWorkDayPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [row, setRow] = useState<WorkDay | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void getWorkDay(params.id)
      .then((found) => {
        if (!found) setError('Jour ouvré introuvable.')
        else setRow(found)
      })
      .catch((err) => setError(err instanceof HttpError ? err.message : 'Erreur'))
      .finally(() => setLoading(false))
  }, [params.id])

  const label = row ? `${row.shiftType?.name ?? 'Horaire'} — ${WEEK_DAY_LABELS[row.day]}` : 'Modifier'

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Jours ouvrés', href: '/work-days' }, { label }]}
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : row ? (
        <WorkDayForm
          submitLabel="Enregistrer"
          initial={{
            scheduleId: row.shiftTypeId,
            day: row.day,
            startTime: row.startTime,
            endTime: row.endTime,
          }}
          onCancel={() => router.push('/work-days')}
          onSubmit={async (values) => {
            await updateWorkDay(params.id, values)
            router.push('/work-days')
          }}
        />
      ) : null}
    </div>
  )
}
