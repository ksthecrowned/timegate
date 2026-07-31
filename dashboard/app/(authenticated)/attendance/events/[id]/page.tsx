'use client'

import { formatApiDateTime } from '@/lib/date-utils'
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
  getAttendanceEvent,
  getAttendanceEventReviews,
  reviewAttendanceEvent,
} from '@/lib/timegate/attendance'
import type { AttendanceEvent } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'
import { findOption } from '@/lib/select-options'
import { STATUS_OPTIONS } from '@/constants'

export default function AttendanceEventDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [event, setEvent] = useState<AttendanceEvent | null>(null)
  const [reviews, setReviews] = useState<
    Array<{ id: string; action: string; createdAt: string; user?: { email: string } }>
  >([])
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [eventRes, reviewRes] = await Promise.all([
        getAttendanceEvent(id),
        getAttendanceEventReviews(id),
      ])
      setEvent(eventRes)
      setReviews(reviewRes.reviews)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Événement introuvable.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  async function handleReview(status: 'ACCEPTED' | 'REJECTED') {
    setSubmitting(true)
    setError('')
    try {
      await reviewAttendanceEvent(id, {
        status,
        reason: status === 'REJECTED' ? reason : undefined,
      })
      router.refresh()
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Revue impossible.')
    } finally {
      setSubmitting(false)
    }
  }

  const canReview = event?.status === 'REVIEW_REQUIRED'

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Présence', href: '/attendance/events' },
          { label: 'Événements', href: '/attendance/events' },
          { label: 'Détail' },
        ]}
        action={
          <Link href="/attendance/events" className={primaryBtnClass}>
            Retour à la liste
          </Link>
        }
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : event ? (
        <div className="space-y-6">
          <DetailCard title="Événement de pointage">
            <DetailRow
              label="Employé"
              value={
                event.employee
                  ? `${event.employee.firstName} ${event.employee.lastName}`
                  : '—'
              }
            />
            <DetailRow label="Type" value={event.type} />
            <DetailRow
              label="Statut"
              value={<StatusBadge status={findOption(STATUS_OPTIONS, event.status)?.label || ""} />}
            />
            <DetailRow label="Source" value={event.source} />
            <DetailRow label="Kiosk" value={event.kiosk?.name ?? '—'} />
            <DetailRow label="Branche" value={event.branch?.name} />
            <DetailRow
              label="Horodatage"
              value={formatApiDateTime(event.occurredAt)}
            />
            {event.receivedAt && (
              <DetailRow
                label="Reçu le"
                value={formatApiDateTime(event.receivedAt)}
              />
            )}
            {event.rejectReason && (
              <DetailRow label="Motif de rejet" value={event.rejectReason} />
            )}
            <DetailRow
              label="Confiance"
              value={
                event.confidence != null
                  ? `${Math.round(Number(event.confidence) * 100)} %`
                  : '—'
              }
            />
          </DetailCard>

          {canReview && (
            <FormCard title="Revue manuelle">
              <FormField label="Motif (obligatoire si rejet)">
                <Textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Motif de rejet…"
                />
              </FormField>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleReview('ACCEPTED')}
                  className={primaryBtnClass}
                >
                  Accepter
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleReview('REJECTED')}
                  className={secondaryBtnClass}
                >
                  Rejeter
                </button>
              </div>
            </FormCard>
          )}

          {reviews.length > 0 && (
            <DetailCard title="Historique des revues">
              {reviews.map((review) => (
                <DetailRow
                  key={review.id}
                  label={formatApiDateTime(review.createdAt)}
                  value={`${review.action}${review.user?.email ? ` — ${review.user.email}` : ''}`}
                />
              ))}
            </DetailCard>
          )}
        </div>
      ) : null}
    </div>
  )
}
