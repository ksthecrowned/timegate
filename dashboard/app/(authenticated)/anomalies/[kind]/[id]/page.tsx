'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import { FormField, Textarea } from '@/components/ui/FormField'
import {
  ApiErrorBanner,
  DetailCard,
  DetailRow,
  FormCard,
  primaryBtnClass,
  secondaryBtnClass,
} from '@/components/timegate/ui'
import { HttpError } from '@/lib/http'
import { formatApiDate, formatApiDateTime } from '@/lib/date-utils'
import {
  getAnomaly,
  resolveAnomaly,
  type AnomalyItem,
} from '@/lib/timegate/anomalies'
import { employeeDisplayName } from '@/lib/timegate/employee-display'

export default function AnomalyDetailPage() {
  const params = useParams<{ kind: string; id: string }>()
  const router = useRouter()
  const [item, setItem] = useState<AnomalyItem | null>(null)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItem(await getAnomaly(params.kind, params.id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Anomalie introuvable')
    } finally {
      setLoading(false)
    }
  }, [params.kind, params.id])

  useEffect(() => {
    void load()
  }, [load])

  async function handleResolve(decision: 'APPROVED' | 'REJECTED') {
    if (reason.trim().length < 3) {
      setError('Le motif est obligatoire (3 caractères min.).')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await resolveAnomaly(params.kind, params.id, {
        decision,
        reason: reason.trim(),
      })
      router.push('/anomalies')
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Résolution impossible')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Anomalies', href: '/anomalies' },
          { label: item?.title ?? 'Détail' },
        ]}
        action={
          <Link href="/anomalies" className={secondaryBtnClass}>
            Retour
          </Link>
        }
      />

      {error && <ApiErrorBanner message={error} />}

      {loading && <p className="text-sm text-gray-500">Chargement…</p>}

      {item && (
        <>
          <DetailCard title="Anomalie">
            <DetailRow label="Titre" value={item.title} />
            <DetailRow label="Type" value={item.type} />
            <DetailRow
              label="Employé"
              value={
                item.employee
                  ? employeeDisplayName(item.employee)
                  : item.employeeId ?? '—'
              }
            />
            <DetailRow
              label="Jour"
              value={item.workDate ? formatApiDate(item.workDate) : '—'}
            />
            <DetailRow
              label="Survenue"
              value={
                item.occurredAt ? formatApiDateTime(item.occurredAt) : '—'
              }
            />
            <DetailRow label="Détail" value={item.detail ?? '—'} />
            <DetailRow
              label="Fiche liée"
              value={
                <Link href={item.href} className="text-primary hover:underline">
                  Ouvrir
                </Link>
              }
            />
          </DetailCard>

          {item.status === 'OPEN' && (
            <FormCard title="Résolution">
              <FormField label="Motif (obligatoire)" required>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Ex. Confirmé site client / oubli de pointage / rejet hors affectation"
                />
              </FormField>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  disabled={submitting}
                  className={secondaryBtnClass}
                  onClick={() => void handleResolve('REJECTED')}
                >
                  Rejeter
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  className={primaryBtnClass}
                  onClick={() => void handleResolve('APPROVED')}
                >
                  Approuver
                </button>
              </div>
            </FormCard>
          )}
        </>
      )}
    </div>
  )
}
