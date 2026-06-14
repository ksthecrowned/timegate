'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import StatusBadge from '@/components/ui/StatusBadge'
import AttendanceDayEditForm from '@/components/timegate/AttendanceDayEditForm'
import { ApiErrorBanner, DetailCard, DetailRow, primaryBtnClass } from '@/components/timegate/ui'
import { getAttendanceDay } from '@/lib/timegate/attendance'
import type { AttendanceDay } from '@/lib/timegate/types'
import { formatApiDate } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'

export default function AttendanceDayDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [day, setDay] = useState<AttendanceDay | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setDay(await getAttendanceDay(id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Jour introuvable.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const employeeName = day?.employee
    ? `${day.employee.firstName} ${day.employee.lastName}`.trim()
    : day?.employeeName

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Présence', href: '/attendance/days' },
          { label: 'Jours', href: '/attendance/days' },
          { label: day ? formatApiDate(day.date) : 'Détail' },
        ]}
        action={
          <Link href="/attendance/days" className={primaryBtnClass}>
            Retour à la liste
          </Link>
        }
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : day ? (
        <div className="space-y-6">
          <DetailCard title={`Présence — ${formatApiDate(day.date)}`}>
            <DetailRow label="Employé" value={employeeName ?? '—'} />
            <DetailRow label="Date" value={formatApiDate(day.date)} />
            <DetailRow
              label="Statut"
              value={<StatusBadge status={String(day.status).toLowerCase()} />}
            />
            <DetailRow label="Horaire" value={day.shift?.name ?? '—'} />
            <DetailRow label="Type congé" value={day.leaveType?.leaveTypeName ?? '—'} />
          </DetailCard>

          <AttendanceDayEditForm day={day} onSaved={() => void load()} />
        </div>
      ) : null}
    </div>
  )
}
