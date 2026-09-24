'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import {
  ApiErrorBanner,
  DetailCard,
  DetailRow,
  primaryBtnClass,
  secondaryBtnClass,
} from '@/components/timegate/ui'
import { HttpError } from '@/lib/http'
import {
  getClientMission,
  updateClientMission,
  type ClientMission,
} from '@/lib/timegate/client-missions'
import { formatApiDateTime } from '@/lib/date-utils'

export default function ClientMissionDetailPage() {
  const params = useParams<{ id: string }>()
  const [mission, setMission] = useState<ClientMission | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      setMission(await getClientMission(params.id))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Mission introuvable')
    }
  }, [params.id])

  useEffect(() => {
    void load()
  }, [load])

  async function copyLink() {
    if (!mission) return
    const url = `${window.location.origin}${mission.publicPath}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function setStatus(status: 'ACTIVE' | 'CLOSED' | 'DRAFT') {
    setBusy(true)
    setError('')
    try {
      setMission(await updateClientMission(params.id, { status }))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Mise à jour impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Missions client', href: '/client-missions' },
          { label: mission?.title ?? 'Détail' },
        ]}
        action={
          <div className="flex gap-2">
            <Link href="/client-missions" className={secondaryBtnClass}>
              Retour
            </Link>
            {mission && (
              <Link
                href={mission.publicPath}
                target="_blank"
                className={primaryBtnClass}
              >
                Ouvrir la page QR
              </Link>
            )}
          </div>
        }
      />

      {error && <ApiErrorBanner message={error} />}

      {mission && (
        <>
          <DetailCard title="Mission">
            <DetailRow label="Titre" value={mission.title} />
            <DetailRow label="Statut" value={mission.status} />
            <DetailRow
              label="Lieu"
              value={
                mission.location?.clientLabel ?? mission.location?.name ?? '—'
              }
            />
            <DetailRow label="Branche admin" value={mission.branch?.name ?? '—'} />
            <DetailRow
              label="Créée"
              value={formatApiDateTime(mission.createdAt)}
            />
            <DetailRow
              label="Lien public"
              value={
                <span className="inline-flex items-center gap-2">
                  <code className="text-xs">{mission.publicPath}</code>
                  <button
                    type="button"
                    className="text-primary text-sm hover:underline"
                    onClick={() => void copyLink()}
                  >
                    {copied ? 'Copié' : 'Copier'}
                  </button>
                </span>
              }
            />
          </DetailCard>

          <div className="mt-4 flex flex-wrap gap-2">
            {mission.status !== 'ACTIVE' && (
              <button
                type="button"
                disabled={busy}
                className={primaryBtnClass}
                onClick={() => void setStatus('ACTIVE')}
              >
                Activer
              </button>
            )}
            {mission.status === 'ACTIVE' && (
              <button
                type="button"
                disabled={busy}
                className={secondaryBtnClass}
                onClick={() => void setStatus('CLOSED')}
              >
                Clôturer
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
