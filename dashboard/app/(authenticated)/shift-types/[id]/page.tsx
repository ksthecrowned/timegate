'use client'

import { ApiErrorBanner, DetailCard, DetailRow, primaryBtnClass } from '@/components/timegate/ui'
import ActionButtons from '@/components/ui/ActionButtons'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import { HttpError } from '@/lib/http'
import { deleteShiftType, getShiftType } from '@/lib/timegate/shift-types'
import type { ShiftType, WorkDay } from '@/lib/timegate/types'
import { WEEK_DAY_LABELS } from '@/lib/timegate/work-days'
import WriteLink from '@/components/timegate/WriteLink'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

function formatTime(value: string): string {
  if (value.includes('T')) return value.slice(11, 16)
  return value.slice(0, 5)
}

export default function ShiftTypeDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<ShiftType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRow(await getShiftType(id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Horaire introuvable.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Horaires', href: '/shift-types' },
          { label: row?.name ?? 'Détail' },
        ]}
        action={
          row && (
            <div className="flex gap-2">
              <WriteLink href={`/shift-types/${id}/edit`} className={primaryBtnClass}>
                Modifier
              </WriteLink>
              <ActionButtons
                onDelete={() => {
                  void deleteShiftType(id).then(() => router.push('/shift-types'))
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
        <DetailCard title={row.name}>
          <DetailRow label="Branche" value={row.branch?.name ?? '—'} />
          <DetailRow
            label="Horaires"
            value={`${formatTime(row.startTime)} — ${formatTime(row.endTime)}`}
          />
          <DetailRow label="Tolérance retard (min)" value={row.lateGraceMinutes ?? '—'} />
          <DetailRow
            label="Fenêtre arrivée"
            value={
              row.checkInWindowStart && row.checkInWindowEnd
                ? `${formatTime(row.checkInWindowStart)} — ${formatTime(row.checkInWindowEnd)}`
                : 'Défaut (dérivé du service)'
            }
          />
          <DetailRow
            label="Fenêtre départ"
            value={
              row.checkOutWindowStart && row.checkOutWindowEnd
                ? `${formatTime(row.checkOutWindowStart)} — ${formatTime(row.checkOutWindowEnd)}`
                : 'Défaut (fin de service → minuit)'
            }
          />
          <DetailRow
            label="Plage pause"
            value={
              row.breakWindowStart && row.breakWindowEnd
                ? `${formatTime(row.breakWindowStart)} — ${formatTime(row.breakWindowEnd)} (${row.breakDurationMinutes ?? 60} min)`
                : 'Défaut'
            }
          />
          <DetailRow
            label="Créé le"
            value={new Date(row.createdAt).toLocaleString('fr-FR')}
          />
        </DetailCard>
      ) : null}
      {row?.weekDays && row.weekDays.length > 0 ? (
        <DetailCard title="Jours travaillés">
          {row.weekDays.map((wd: WorkDay) => (
            <DetailRow
              key={wd.id}
              label={WEEK_DAY_LABELS[wd.day] ?? wd.day}
              value={`${formatTime(wd.startTime)} — ${formatTime(wd.endTime)}`}
            />
          ))}
        </DetailCard>
      ) : row ? (
        <DetailCard title="Jours travaillés">
          <p className="px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            Aucun jour configuré — cet horaire ne planifie personne. Modifiez l&apos;horaire pour
            cocher les jours.
          </p>
        </DetailCard>
      ) : null}
    </div>
  )
}
