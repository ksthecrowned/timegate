'use client'

import WriteLink from '@/components/timegate/WriteLink'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import ActionButtons from '@/components/ui/ActionButtons'
import { ApiErrorBanner, DetailCard, DetailRow, primaryBtnClass } from '@/components/timegate/ui'
import { deleteEmploymentType, getEmploymentType } from '@/lib/timegate/employment-types'
import type { EmploymentType } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function EmploymentTypeDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<EmploymentType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRow(await getEmploymentType(id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Introuvable.')
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
          { label: 'Types de contrat', href: '/employment-types' },
          { label: row?.name ?? 'Détail' },
        ]}
        action={
          row ? (
            <div className="flex gap-2">
              <WriteLink href={`/employment-types/${id}/edit`} className={primaryBtnClass}>
                Modifier
              </WriteLink>
              <ActionButtons
                onDelete={() => {
                  void deleteEmploymentType(id).then(() => router.push('/employment-types'))
                }}
              />
            </div>
          ) : null
        }
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : row ? (
        <DetailCard title={row.name}>
          <DetailRow label="Nom" value={row.name} />
          <DetailRow label="Créé le" value={new Date(row.createdAt).toLocaleString('fr-FR')} />
        </DetailCard>
      ) : null}
    </div>
  )
}
