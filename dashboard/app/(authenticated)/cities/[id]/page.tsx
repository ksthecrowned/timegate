'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import ActionButtons from '@/components/ui/ActionButtons'
import { ApiErrorBanner, DetailCard, DetailRow, primaryBtnClass } from '@/components/timegate/ui'
import { deleteCity, getCity } from '@/lib/timegate/cities'
import type { City } from '@/lib/timegate/cities'
import { HttpError } from '@/lib/http'

export default function CityDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [row, setRow] = useState<City | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setRow(await getCity(id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Ville introuvable.')
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
          { label: 'Villes', href: '/cities' },
          { label: row?.name ?? 'Détail' },
        ]}
        action={
          row && (
            <div className="flex gap-2">
              <Link href={`/cities/${id}/edit`} className={primaryBtnClass}>
                Modifier
              </Link>
              <ActionButtons
                onDelete={() => {
                  void deleteCity(id).then(() => router.push('/cities'))
                }}
                deleteMessage={`Supprimer la ville « ${row.name} » ?`}
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
          <DetailRow label="Pays" value={row.country ? `${row.country.name} (${row.country.isoCode})` : '—'} />
          <DetailRow label="Latitude" value={row.latitude != null ? String(row.latitude) : '—'} />
          <DetailRow label="Longitude" value={row.longitude != null ? String(row.longitude) : '—'} />
          <DetailRow label="Créé le" value={new Date(row.createdAt).toLocaleString('fr-FR')} />
        </DetailCard>
      ) : null}
    </div>
  )
}
