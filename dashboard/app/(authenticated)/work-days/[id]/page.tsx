'use client'

import WriteLink from '@/components/timegate/WriteLink'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import ActionButtons from '@/components/ui/ActionButtons'
import { ApiErrorBanner, DetailCard, DetailRow, primaryBtnClass } from '@/components/timegate/ui'
import { deleteWorkDay, getWorkDay, WEEK_DAY_LABELS } from '@/lib/timegate/work-days'
import type { WorkDay } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

function formatTime(value: string): string {
  if (value.includes('T')) return value.slice(11, 16)
  return value.slice(0, 5)
}

export default function WorkDayDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<WorkDay | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRow(await getWorkDay(id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Jour ouvré introuvable.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const title = row
    ? `${row.shiftType?.name ?? 'Horaire'} — ${WEEK_DAY_LABELS[row.day]}`
    : 'Détail'

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Jours ouvrés', href: '/work-days' },
          { label: title },
        ]}
        action={
          row && (
            <div className="flex gap-2">
              <WriteLink href={`/work-days/${id}/edit`} className={primaryBtnClass}>
                Modifier
              </WriteLink>
              <ActionButtons
                onDelete={() => {
                  void deleteWorkDay(id).then(() => router.push('/work-days'))
                }}
              />
            </div>
          )
        }
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : row ? (
        <DetailCard title={title}>
          <DetailRow label="Horaire" value={row.shiftType?.name ?? '—'} />
          <DetailRow label="Jour" value={WEEK_DAY_LABELS[row.day] ?? row.day} />
          <DetailRow
            label="Plage horaire"
            value={`${formatTime(row.startTime)} — ${formatTime(row.endTime)}`}
          />
        </DetailCard>
      ) : null}
    </div>
  )
}
