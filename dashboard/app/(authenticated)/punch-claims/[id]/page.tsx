'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import StatusBadge from '@/components/ui/StatusBadge'
import { FormField, Textarea } from '@/components/ui/FormField'
import {
  ApiErrorBanner,
  DetailCard,
  DetailRow,
  FormCard,
  primaryBtnClass,
  secondaryBtnClass,
} from '@/components/timegate/ui'
import {
  getPunchClaim,
  PUNCH_CLAIM_TYPE_LABELS,
  reviewPunchClaim,
  type PunchClaim,
} from '@/lib/timegate/punch-claims'
import { HttpError } from '@/lib/http'

export default function PunchClaimDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [claim, setClaim] = useState<PunchClaim | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setClaim(await getPunchClaim(id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Réclamation introuvable.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function handleReview(status: 'APPROVED' | 'REJECTED') {
    setSubmitting(true)
    setError('')
    try {
      await reviewPunchClaim(id, {
        status,
        reviewNote: status === 'REJECTED' ? reviewNote : undefined,
      })
      router.refresh()
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Action impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  const canReview = claim?.status === 'OPEN'
  const employeeName = claim?.employee
    ? `${claim.employee.firstName ?? ''} ${claim.employee.lastName ?? ''}`.trim() ||
      claim.employee.employeeName
    : '—'

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Manager', href: '/manager/inbox' },
          { label: 'Inbox', href: '/manager/inbox' },
          { label: 'Réclamation' },
        ]}
        action={
          <Link href="/manager/inbox" className={primaryBtnClass}>
            Retour inbox
          </Link>
        }
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : claim ? (
        <div className="space-y-6">
          <DetailCard title="Réclamation pointage">
            <DetailRow label="Employé" value={employeeName} />
            <DetailRow label="Date concernée" value={claim.workDate} />
            <DetailRow
              label="Type"
              value={PUNCH_CLAIM_TYPE_LABELS[claim.type] ?? claim.type}
            />
            <DetailRow label="Motif" value={claim.reason} />
            <DetailRow
              label="Statut"
              value={<StatusBadge status={claim.status} />}
            />
            {claim.timesheetDayId ? (
              <DetailRow
                label="Journée timesheet"
                value={
                  <Link href={`/timesheets/${claim.timesheetDayId}`} className="text-teal-700 underline">
                    Voir la fiche jour
                  </Link>
                }
              />
            ) : null}
            {claim.reviewNote ? (
              <DetailRow label="Note de revue" value={claim.reviewNote} />
            ) : null}
          </DetailCard>

          {canReview ? (
            <FormCard title="Décision manager">
              <FormField label="Note (obligatoire si refus)">
                <Textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={3}
                  placeholder="Commentaire pour l'employé ou l'admin RH…"
                />
              </FormField>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  className={primaryBtnClass}
                  disabled={submitting}
                  onClick={() => void handleReview('APPROVED')}
                >
                  Approuver
                </button>
                <button
                  type="button"
                  className={secondaryBtnClass}
                  disabled={submitting}
                  onClick={() => void handleReview('REJECTED')}
                >
                  Rejeter
                </button>
              </div>
            </FormCard>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
