'use client'

import { formatApiDateTime } from '@/lib/date-utils'
import { ApiErrorBanner, DetailCard, DetailRow, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import WriteLink from '@/components/timegate/WriteLink'
import ActionButtons from '@/components/ui/ActionButtons'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import StatusBadge from '@/components/ui/StatusBadge'
import { HttpError } from '@/lib/http'
import { deleteKiosk, getKiosk, resetKioskAccess } from '@/lib/timegate/kiosks'
import type { Kiosk } from '@/lib/timegate/types'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

export default function KioskDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [kiosk, setKiosk] = useState<Kiosk | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [resetting, setResetting] = useState(false)

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
            <div className="flex flex-wrap gap-2">
              <WriteLink href={`/kiosks/${id}/edit`} className={primaryBtnClass}>
                Modifier
              </WriteLink>
              <button
                type="button"
                disabled={resetting}
                className={secondaryBtnClass}
                onClick={async () => {
                  if (
                    !window.confirm(
                      'Réinitialiser les accès de cette borne ? L’appareil devra être re-provisionné (écran de configuration).',
                    )
                  ) {
                    return
                  }
                  setResetting(true)
                  setError('')
                  setInfo('')
                  try {
                    const updated = await resetKioskAccess(id)
                    setKiosk(updated)
                    setInfo(
                      'Accès réinitialisés. Sur la borne, l’app demandera une nouvelle configuration.',
                    )
                  } catch (err) {
                    setError(
                      err instanceof HttpError
                        ? err.message
                        : 'Impossible de réinitialiser les accès.',
                    )
                  } finally {
                    setResetting(false)
                  }
                }}
              >
                {resetting ? 'Réinitialisation…' : 'Réinitialiser les accès'}
              </button>
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
      {info ? (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          {info}
        </p>
      ) : null}
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
            label="Méthodes"
            value={[
              kiosk.faceEnabled !== false ? 'Visage' : null,
              kiosk.nfcEnabled ? 'NFC' : null,
              kiosk.qrEnabled ? 'QR' : null,
            ]
              .filter(Boolean)
              .join(' · ') || '—'}
          />
          <DetailRow
            label="Dernière activité"
            value={
              kiosk.lastSeenAt
                ? formatApiDateTime(kiosk.lastSeenAt)
                : null
            }
          />
        </DetailCard>
      ) : null}
    </div>
  )
}
