'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import StatusBadge from '@/components/ui/StatusBadge'
import ActionButtons from '@/components/ui/ActionButtons'
import { ApiErrorBanner, DetailCard, DetailRow, primaryBtnClass } from '@/components/timegate/ui'
import { deleteKiosk, getKiosk } from '@/lib/timegate/kiosks'
import type { Kiosk } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function KioskDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [kiosk, setKiosk] = useState<Kiosk | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setKiosk(await getKiosk(id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Kiosque introuvable.')
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
          { label: 'Kiosques', href: '/kiosks' },
          { label: kiosk?.name ?? 'Détail' },
        ]}
        action={
          kiosk && (
            <div className="flex gap-2">
              <Link href={`/kiosks/${id}/edit`} className={primaryBtnClass}>
                Modifier
              </Link>
              <ActionButtons
                onDelete={async () => {
                  await deleteKiosk(id)
                  router.push('/kiosks')
                }}
                deleteMessage="Ce kiosque sera définitivement supprimé."
              />
            </div>
          )
        }
      />
      <ApiErrorBanner message={error} />
      {loading ? (
        <SkeletonDetailCard />
      ) : kiosk ? (
        <DetailCard title={kiosk.name}>
          <DetailRow label="Branche" value={kiosk.branch?.name ?? '—'} />
          <DetailRow
            label="Emplacement horaire"
            value={kiosk.shiftLocation?.name ?? kiosk.location ?? '—'}
          />
          <DetailRow
            label="Statut"
            value={<StatusBadge status={String(kiosk.status).toLowerCase()} />}
          />
          <DetailRow label="Actif" value={kiosk.isActive ? 'Oui' : 'Non'} />
          <DetailRow
            label="Dernière activité"
            value={
              kiosk.lastSeenAt
                ? new Date(kiosk.lastSeenAt).toLocaleString('fr-FR')
                : null
            }
          />
          <DetailRow label="Clé API" value={kiosk.apiKey ? '••••••••' : '—'} />
        </DetailCard>
      ) : null}
    </div>
  )
}
