'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import ActionButtons from '@/components/ui/ActionButtons'
import { ApiErrorBanner, DetailCard, DetailRow, primaryBtnClass } from '@/components/timegate/ui'
import { deleteShiftType, getShiftType } from '@/lib/timegate/shift-types'
import type { ShiftType, WorkDay } from '@/lib/timegate/types'
import { WEEK_DAY_LABELS } from '@/lib/timegate/work-days'
import { HttpError } from '@/lib/http'

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
              <Link href={`/shift-types/${id}/edit`} className={primaryBtnClass}>
                Modifier
              </Link>
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
            label="Créé le"
            value={new Date(row.createdAt).toLocaleString('fr-FR')}
          />
        </DetailCard>
      ) : null}
      {row?.weekDays && row.weekDays.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-neutral-200">
              Jours de la semaine
            </h3>
            <Link
              href={`/work-days?scheduleId=${row.id}`}
              className="text-sm text-primary hover:underline"
            >
              Gérer les jours
            </Link>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl dark:bg-neutral-800 dark:border-neutral-700 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-neutral-700 text-sm">
              <thead className="bg-gray-50 dark:bg-neutral-900">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-neutral-400">Jour</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-neutral-400">Horaires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                {row.weekDays.map((wd: WorkDay) => (
                  <tr key={wd.id}>
                    <td className="px-4 py-2">{WEEK_DAY_LABELS[wd.day] ?? wd.day}</td>
                    <td className="px-4 py-2">
                      {formatTime(wd.startTime)} — {formatTime(wd.endTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
