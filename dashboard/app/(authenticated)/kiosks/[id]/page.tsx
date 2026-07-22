'use client'

import WriteLink from '@/components/timegate/WriteLink'
import { useParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { SkeletonDetailCard } from '@/components/ui/Skeleton'
import StatusBadge from '@/components/ui/StatusBadge'
import ActionButtons from '@/components/ui/ActionButtons'
import { ApiErrorBanner, DetailCard, DetailRow, primaryBtnClass } from '@/components/timegate/ui'
import { deleteKiosk, getKiosk, regenerateKioskApiKey } from '@/lib/timegate/kiosks'
import type { Kiosk } from '@/lib/timegate/types'
import { HttpError } from '@/lib/http'

export default function KioskDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id
  const [kiosk, setKiosk] = useState<Kiosk | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [apiKeyVisible, setApiKeyVisible] = useState(false)
  const [regeneratingKey, setRegeneratingKey] = useState(false)

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
              <WriteLink href={`/kiosks/${id}/edit`} className={primaryBtnClass}>
                Modifier
              </WriteLink>
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
                ? new Date(kiosk.lastSeenAt).toLocaleString('fr-FR')
                : null
            }
          />
          <DetailRow
            label="Clé API"
            value={
              kiosk.apiKey ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="rounded bg-gray-100 px-2 py-1 text-xs dark:bg-neutral-900">
                    {apiKeyVisible ? kiosk.apiKey : '••••••••••••••••'}
                  </code>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setApiKeyVisible((v) => !v)}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {apiKeyVisible ? 'Masquer' : 'Afficher'}
                    </button>
                    <button
                      type="button"
                      disabled={regeneratingKey}
                      onClick={async () => {
                        if (
                          !window.confirm(
                            'Régénérer la clé API ? Les intégrations utilisant l’ancienne clé cesseront de fonctionner.',
                          )
                        ) {
                          return
                        }
                        setRegeneratingKey(true)
                        setError('')
                        try {
                          const updated = await regenerateKioskApiKey(id)
                          setKiosk(updated)
                          setApiKeyVisible(true)
                        } catch (err) {
                          setError(
                            err instanceof HttpError
                              ? err.message
                              : 'Impossible de régénérer la clé API.',
                          )
                        } finally {
                          setRegeneratingKey(false)
                        }
                      }}
                      className="text-sm font-medium text-amber-700 hover:underline disabled:opacity-50 dark:text-amber-400"
                    >
                      {regeneratingKey ? 'Régénération…' : 'Régénérer'}
                    </button>
                  </div>
                </div>
              ) : (
                '—'
              )
            }
          />
        </DetailCard>
      ) : null}
    </div>
  )
}
