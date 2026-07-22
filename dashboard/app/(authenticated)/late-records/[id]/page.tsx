'use client'

import WriteLink from '@/components/timegate/WriteLink'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import ActionButtons from '@/components/ui/ActionButtons'
import { ApiErrorBanner, DetailCard, DetailRow, primaryBtnClass } from '@/components/timegate/ui'
import { deleteLateRecord, getLateRecord } from '@/lib/timegate/late-records'
import type { LateRecord } from '@/lib/timegate/types'
import { formatApiDate } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'
import { employeeDisplayName } from '@/lib/timegate/employee-display'

function employeeLabel(row: LateRecord): string {
  return employeeDisplayName(row.employee)
}

export default function LateRecordDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<LateRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRow(await getLateRecord(id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Retard introuvable.')
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
          { label: 'Retards', href: '/late-records' },
          { label: row ? employeeLabel(row) : 'Détail' },
        ]}
        action={
          row && (
            <div className="flex gap-2">
              <WriteLink href={`/late-records/${id}/edit`} className={primaryBtnClass}>
                Modifier
              </WriteLink>
              <ActionButtons
                onDelete={() => {
                  void deleteLateRecord(id).then(() => router.push('/late-records'))
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
        <DetailCard title="Retard">
          <DetailRow label="Employé" value={employeeLabel(row)} />
          <DetailRow label="Date" value={formatApiDate(row.date)} />
          <DetailRow label="Minutes de retard" value={row.latenessMinutes} />
          <DetailRow label="Justifié" value={row.justified ? 'Oui' : 'Non'} />
          <DetailRow label="Motif" value={row.reason ?? '—'} />
          <DetailRow
            label="Justificatif"
            value={
              row.justificationFileUrl ? (
                <a
                  href={row.justificationFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  Télécharger
                </a>
              ) : (
                '—'
              )
            }
          />
          <DetailRow
            label="Créé le"
            value={new Date(row.createdAt).toLocaleString('fr-FR')}
          />
        </DetailCard>
      ) : null}
    </div>
  )
}
