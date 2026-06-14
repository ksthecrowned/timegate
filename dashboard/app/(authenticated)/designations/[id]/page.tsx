'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import ActionButtons from '@/components/ui/ActionButtons'
import { ApiErrorBanner, DetailCard, DetailRow, primaryBtnClass } from '@/components/timegate/ui'
import { deleteDesignation, getDesignation } from '@/lib/timegate/designations'
import type { Designation } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function DesignationDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<Designation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRow(await getDesignation(id))
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
        breadcrumbs={[{ label: 'Postes', href: '/designations' }, { label: row?.name ?? 'Détail' }]}
        action={row && (
          <div className="flex gap-2">
            <Link href={`/designations/${id}/edit`} className={primaryBtnClass}>Modifier</Link>
            <ActionButtons onDelete={() => { void deleteDesignation(id).then(() => router.push('/designations')) }} />
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

