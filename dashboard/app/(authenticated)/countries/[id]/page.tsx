'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import ActionButtons from '@/components/ui/ActionButtons'
import { ApiErrorBanner, DetailCard, DetailRow, primaryBtnClass } from '@/components/timegate/ui'
import { deleteCountry, getCountry } from '@/lib/timegate/countries'
import type { Country } from '@/lib/timegate/countries'
import { HttpError } from '@/lib/http'

export default function CountryDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<Country | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRow(await getCountry(id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Pays introuvable.')
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
          { label: 'Plateforme' },
          { label: 'Pays', href: '/countries' },
          { label: row?.name ?? 'Détail' },
        ]}
        action={
          row && (
            <div className="flex gap-2">
              <Link href={`/countries/${id}/edit`} className={primaryBtnClass}>
                Modifier
              </Link>
              <ActionButtons
                onDelete={() => {
                  void deleteCountry(id).then(() => router.push('/countries'))
                }}
                deleteMessage={`Supprimer le pays « ${row.name} » ?`}
              />
            </div>
          )
        }
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : row ? (
        <DetailCard title={row.name}>
          <DetailRow label="Code ISO" value={row.isoCode} />
          <DetailRow label="Indicatif" value={row.phoneCode ?? '—'} />
          <DetailRow label="Créé le" value={new Date(row.createdAt).toLocaleString('fr-FR')} />
          <DetailRow label="Modifié le" value={new Date(row.updatedAt).toLocaleString('fr-FR')} />
        </DetailCard>
      ) : null}
    </div>
  )
}
