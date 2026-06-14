'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import ActionButtons from '@/components/ui/ActionButtons'
import { ApiErrorBanner, DetailCard, DetailRow, primaryBtnClass } from '@/components/timegate/ui'
import { employeeLabel } from '@/components/timegate/hooks'
import { deleteShiftAssignment, getShiftAssignment } from '@/lib/timegate/shift-assignments'
import type { ShiftAssignment } from '@/lib/timegate/types'
import { formatApiDate, formatApiDateTime } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'

export default function ShiftAssignmentDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<ShiftAssignment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRow(await getShiftAssignment(id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Affectation introuvable.')
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
          { label: 'Affectations horaires', href: '/shift-assignments' },
          { label: employeeLabel(row?.employee) },
        ]}
        action={
          row && (
            <div className="flex gap-2">
              <Link href={`/shift-assignments/${id}/edit`} className={primaryBtnClass}>
                Modifier
              </Link>
              <ActionButtons
                onDelete={() => {
                  void deleteShiftAssignment(id).then(() =>
                    router.push('/shift-assignments'),
                  )
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
        <DetailCard title={`Affectation — ${employeeLabel(row.employee)}`}>
          <DetailRow label="Employé" value={employeeLabel(row.employee)} />
          <DetailRow label="Horaire" value={row.shiftType?.name ?? '—'} />
          <DetailRow
            label="Lieu"
            value={row.shiftLocation?.name ?? '—'}
          />
          <DetailRow label="Date début" value={formatApiDate(row.startDate)} />
          <DetailRow label="Date fin" value={formatApiDate(row.endDate)} />
          <DetailRow label="Créée le" value={formatApiDateTime(row.createdAt)} />
        </DetailCard>
      ) : null}
    </div>
  )
}
