'use client'

import { formatApiDateTime } from '@/lib/date-utils'
import { useCallback, useEffect, useState } from 'react'
import {
  listEmployeeTrustedDevices,
  updateTrustedDeviceStatus,
  type TrustedDevice,
} from '@/lib/timegate/trusted-devices'
import { HttpError } from '@/lib/http'
import ConfirmModal from '@/components/ui/ConfirmModal'
import StatusBadge from '@/components/ui/StatusBadge'
import { SkeletonBlock } from '@/components/ui/Skeleton'
import { ApiErrorBanner, FormCard, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'

function platformLabel(platform: string): string {
  const p = platform.toLowerCase()
  if (p.includes('ios') || p.includes('iphone') || p.includes('ipad')) return 'iOS'
  if (p.includes('android')) return 'Android'
  if (p.includes('web')) return 'Web'
  return platform
}

export default function EmployeeTrustedDevicesCard({
  employeeId,
  bare = false,
}: {
  employeeId: string
  bare?: boolean
}) {
  const [devices, setDevices] = useState<TrustedDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revokeId, setRevokeId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listEmployeeTrustedDevices(employeeId)
      setDevices(res.data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Impossible de charger les appareils.')
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  useEffect(() => {
    void load()
  }, [load])

  async function approve(deviceId: string) {
    setBusyId(deviceId)
    setError('')
    try {
      await updateTrustedDeviceStatus(employeeId, deviceId, 'TRUSTED')
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Approbation impossible.')
    } finally {
      setBusyId(null)
    }
  }

  async function revoke(deviceId: string) {
    setBusyId(deviceId)
    setError('')
    try {
      await updateTrustedDeviceStatus(employeeId, deviceId, 'REVOKED')
      setRevokeId(null)
      await load()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Révocation impossible.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <FormCard title="Appareils de confiance" bare={bare}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-neutral-400">
          Téléphones autorisés pour le pointage mobile (QR, reprise pause). L’employé enregistre un
          appareil depuis le portail ; vous validez ensuite la demande ici.
        </p>

        <ApiErrorBanner message={error} />

        {loading ? (
          <div className="space-y-3" aria-busy="true">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200/80 p-4 dark:border-border-dark"
              >
                <SkeletonBlock className="mb-3 h-4 w-40" />
                <SkeletonBlock className="mb-2 h-3 w-full" />
                <SkeletonBlock className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : null}

        {!loading && devices.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500 dark:text-neutral-400">
            Aucun appareil enregistré. Demandez à l’employé de se connecter au portail mobile pour
            enregistrer son téléphone.
          </p>
        ) : null}

        {!loading && devices.length > 0 ? (
          <ul className="space-y-3">
            {devices.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 px-4 py-3 dark:border-border-dark"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {d.deviceLabel ?? platformLabel(d.platform)}
                    </p>
                    <StatusBadge status={d.status} />
                    {d.sharedDevice ? (
                      <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                        Partagé
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-neutral-400">
                    {platformLabel(d.platform)}
                    {d.trustedAt ? ` · approuvé le ${formatApiDateTime(d.trustedAt)}` : null}
                    {' · '}
                    dernière activité {formatApiDateTime(d.lastSeenAt)}
                  </p>
                  <p className="truncate font-mono text-[11px] text-gray-400 dark:text-neutral-500">
                    {d.deviceInstallId}
                  </p>
                </div>
                <div className="flex gap-2">
                  {d.status === 'PENDING' ? (
                    <button
                      type="button"
                      className={primaryBtnClass}
                      disabled={busyId === d.id}
                      onClick={() => void approve(d.id)}
                    >
                      Approuver
                    </button>
                  ) : null}
                  {d.status !== 'REVOKED' ? (
                    <button
                      type="button"
                      className={secondaryBtnClass}
                      disabled={busyId === d.id}
                      onClick={() => setRevokeId(d.id)}
                    >
                      Révoquer
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <ConfirmModal
        open={Boolean(revokeId)}
        title="Révoquer cet appareil ?"
        message="L’employé devra redemander l’accès depuis le portail pour pointer à nouveau depuis ce téléphone."
        confirmLabel="Révoquer"
        cancelLabel="Annuler"
        danger
        onConfirm={() => {
          if (revokeId) void revoke(revokeId)
        }}
        onCancel={() => setRevokeId(null)}
      />
    </FormCard>
  )
}
