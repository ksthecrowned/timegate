'use client'

import WriteLink from '@/components/timegate/WriteLink'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import ActionButtons from '@/components/ui/ActionButtons'
import { ApiErrorBanner, DetailCard, DetailRow, primaryBtnClass } from '@/components/timegate/ui'
import { deleteDepartment, getDepartment } from '@/lib/timegate/departments'
import type { Department } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function DepartmentDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<Department | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRow(await getDepartment(id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Introuvable.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: 'Départements', href: '/departments' }, { label: row?.name ?? 'Détail' }]}
        action={row && (
          <div className="flex gap-2">
            <WriteLink href={`/departments/${id}/edit`} className={primaryBtnClass}>Modifier</WriteLink>
            <ActionButtons onDelete={() => { void deleteDepartment(id).then(() => router.push('/departments')) }} />
          </div>
        )}
      />
      <ApiErrorBanner message={error} />
      {loading ? <SkeletonDetailCard /> : row ? (
        <DetailCard title={row.name}>
          <DetailRow label="Nom" value={row.name} />
          <DetailRow label="Créé le" value={new Date(row.createdAt).toLocaleString('fr-FR')} />
        </DetailCard>
      ) : null}
    </div>
  )
}

