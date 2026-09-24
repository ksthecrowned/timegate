'use client'

import WriteLink from '@/components/timegate/WriteLink'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import ActionButtons from '@/components/ui/ActionButtons'
import {
  ApiErrorBanner,
  DetailCard,
  DetailRow,
  primaryBtnClass,
  secondaryBtnClass,
} from '@/components/timegate/ui'
import { employeeLabel } from '@/components/timegate/hooks'
import {
  closeShiftAssignment,
  deleteShiftAssignment,
  getShiftAssignment,
} from '@/lib/timegate/shift-assignments'
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
  const [closing, setClosing] = useState(false)

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

  const isOpen =
    !row?.endDate ||
    new Date(row.endDate).getTime() >=
      new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`).getTime()

  async function handleClose(endContract: boolean) {
    if (!row || closing) return
    const ok = window.confirm(
      endContract
        ? 'Clôturer cette affectation et terminer le contrat courant ? L’employé n’est pas supprimé.'
        : 'Clôturer cette affectation (date de fin = aujourd’hui) ? L’employé n’est pas supprimé.',
    )
    if (!ok) return
    setClosing(true)
    setError('')
    try {
      const updated = await closeShiftAssignment(id, {
        endCurrentContract: endContract,
        reason: endContract ? 'Fin de mission' : 'Clôture d’affectation',
      })
      setRow(updated)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Clôture impossible.')
    } finally {
      setClosing(false)
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Affectations horaires', href: '/shift-assignments' },
          { label: employeeLabel(row?.employee) },
        ]}
        action={
          row && (
            <div className="flex flex-wrap gap-2">
              {isOpen && (
                <>
                  <button
                    type="button"
                    className={secondaryBtnClass}
                    disabled={closing}
                    onClick={() => void handleClose(false)}
                  >
                    Clôturer
                  </button>
                  <button
                    type="button"
                    className={secondaryBtnClass}
                    disabled={closing}
                    onClick={() => void handleClose(true)}
                  >
                    Fin de mission
                  </button>
                </>
              )}
              <WriteLink href={`/shift-assignments/${id}/edit`} className={primaryBtnClass}>
                Modifier
              </WriteLink>
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
            value={row.location?.name ?? row.shiftLocation?.name ?? '—'}
          />
          <DetailRow label="Date début" value={formatApiDate(row.startDate)} />
          <DetailRow label="Date fin" value={formatApiDate(row.endDate)} />
          <DetailRow label="Créée le" value={formatApiDateTime(row.createdAt)} />
        </DetailCard>
      ) : null}
    </div>
  )
}
