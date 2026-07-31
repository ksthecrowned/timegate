'use client'

import WriteLink from '@/components/timegate/WriteLink'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import ActionButtons from '@/components/ui/ActionButtons'
import StatusBadge from '@/components/ui/StatusBadge'
import { ApiErrorBanner, DetailCard, DetailRow, primaryBtnClass } from '@/components/timegate/ui'
import { deleteLeave, getLeave } from '@/lib/timegate/leaves'
import type { Leave } from '@/lib/timegate/types'
import { formatApiDate, formatApiDateTime } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'

import { employeeDisplayName } from '@/lib/timegate/employee-display'

function employeeLabel(row: Leave): string {
  return employeeDisplayName(row.employee)
}

export default function LeaveDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<Leave | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRow(await getLeave(id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Congé introuvable.')
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
          { label: 'Congés', href: '/leaves' },
          { label: row ? employeeLabel(row) : 'Détail' },
        ]}
        action={
          row && (
            <div className="flex gap-2">
              <WriteLink href={`/leaves/${id}/edit`} className={primaryBtnClass}>
                Modifier
              </WriteLink>
              <ActionButtons
                onDelete={() => {
                  void deleteLeave(id).then(() => router.push('/leaves'))
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
        <DetailCard title="Congé">
          <DetailRow label="Employé" value={employeeLabel(row)} />
          <DetailRow
            label="Type"
            value={row.leaveType?.leaveTypeName ?? row.type ?? '—'}
          />
          <DetailRow label="Date début" value={formatApiDate(row.startDate)} />
          <DetailRow label="Date fin" value={formatApiDate(row.endDate)} />
          <DetailRow
            label="Statut"
            value={<StatusBadge status={row.status.toLowerCase()} />}
          />
          <DetailRow label="Motif" value={row.reason ?? '—'} />
          <DetailRow
            label="Créé le"
            value={formatApiDateTime(row.createdAt)}
          />
        </DetailCard>
      ) : null}
    </div>
  )
}
