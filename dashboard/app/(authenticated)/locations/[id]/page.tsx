'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import PageHeader from '@/components/ui/PageHeader'
import {
  archiveLocation,
  getLocation,
  restoreLocation,
  type TimeGateLocation,
} from '@/lib/timegate/locations'
import { HttpError } from '@/lib/http'
import { primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import { formatApiDate } from '@/lib/date-utils'

const TYPE_LABELS: Record<string, string> = {
  BRANCH_SITE: 'Site branche',
  CLIENT_SITE: 'Site client',
  TEMPORARY: 'Temporaire',
}

export default function LocationDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [location, setLocation] = useState<TimeGateLocation | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void getLocation(params.id)
      .then(setLocation)
      .catch((err) =>
        setError(err instanceof HttpError ? err.message : 'Lieu introuvable'),
      )
  }, [params.id])

  async function handleArchive() {
    if (!location?.isActive) return
    if (
      !window.confirm(
        'Archiver ce lieu ? Les kiosks seront désactivés et les affectations ouvertes clôturées. L’historique est conservé.',
      )
    ) {
      return
    }
    setBusy(true)
    setError('')
    try {
      const updated = await archiveLocation(params.id)
      setLocation(updated)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Archivage impossible')
    } finally {
      setBusy(false)
    }
  }

  async function handleRestore() {
    if (location?.isActive) return
    setBusy(true)
    setError('')
    try {
      const updated = await restoreLocation(params.id)
      setLocation(updated)
      router.refresh()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Réactivation impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Lieux de pointage', href: '/locations' },
          { label: location?.name ?? 'Détail' },
        ]}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/locations" className={secondaryBtnClass}>
              Retour
            </Link>
            {location?.isActive ? (
              <>
                <Link href={`/locations/${params.id}/edit`} className={primaryBtnClass}>
                  Modifier
                </Link>
                <button
                  type="button"
                  className={secondaryBtnClass}
                  disabled={busy}
                  onClick={() => void handleArchive()}
                >
                  Archiver
                </button>
              </>
            ) : (
              <button
                type="button"
                className={primaryBtnClass}
                disabled={busy}
                onClick={() => void handleRestore()}
              >
                Réactiver
              </button>
            )}
          </div>
        }
      />

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      {location && (
        <div className="tb-card p-6 space-y-3 text-sm">
          <p>
            <span className="text-gray-500">Type :</span> {TYPE_LABELS[location.type] ?? location.type}
          </p>
          <p>
            <span className="text-gray-500">Statut :</span>{' '}
            {location.isActive ? 'Actif' : 'Archivé'}
          </p>
          {!location.isActive && (
            <p className="text-amber-700 text-xs">
              Lieu archivé — les bornes restent désactivées jusqu’à réactivation manuelle.
            </p>
          )}
          {location.clientLabel && (
            <p>
              <span className="text-gray-500">Client :</span> {location.clientLabel}
            </p>
          )}
          {location.address && (
            <p>
              <span className="text-gray-500">Adresse :</span> {location.address}
            </p>
          )}
          {location.timeZone && (
            <p>
              <span className="text-gray-500">Fuseau :</span> {location.timeZone}
            </p>
          )}
          {(location.latitude != null || location.longitude != null) && (
            <p>
              <span className="text-gray-500">GPS :</span> {location.latitude}, {location.longitude}
              {location.checkinRadius != null ? ` (±${location.checkinRadius} m)` : ''}
            </p>
          )}
          <p>
            <span className="text-gray-500">Créé le :</span> {formatApiDate(location.createdAt)}
          </p>
        </div>
      )}
    </div>
  )
}
