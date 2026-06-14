'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import ActionButtons from '@/components/ui/ActionButtons'
import { ApiErrorBanner, DetailCard, DetailRow, primaryBtnClass } from '@/components/timegate/ui'
import { deleteAbsence, getAbsence } from '@/lib/timegate/absences'
import type { Absence } from '@/lib/timegate/types'
import { formatApiDate } from '@/lib/date-utils'
import { HttpError } from '@/lib/http'
import { employeeDisplayName } from '@/lib/timegate/employee-display'

function employeeLabel(row: Absence): string {
  return employeeDisplayName(row.employee)
}

export default function AbsenceDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<Absence | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRow(await getAbsence(id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Absence introuvable.')
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
          { label: 'Absences', href: '/absences' },
          { label: row ? employeeLabel(row) : 'Détail' },
        ]}
        action={
          row && (
            <div className="flex gap-2">
              <Link href={`/absences/${id}/edit`} className={primaryBtnClass}>
                Modifier
              </Link>
              <ActionButtons
                onDelete={() => {
                  void deleteAbsence(id).then(() => router.push('/absences'))
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
        <DetailCard title="Absence">
          <DetailRow label="Employé" value={employeeLabel(row)} />
          <DetailRow label="Date" value={formatApiDate(row.date)} />
          <DetailRow label="Justifiée" value={row.justified ? 'Oui' : 'Non'} />
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
