'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  listEmployeeTrustedDevices,
  updateTrustedDeviceStatus,
  type TrustedDevice,
} from '@/lib/timegate/trusted-devices'
import { HttpError } from '@/lib/http'
import { secondaryBtnClass, primaryBtnClass } from '@/components/timegate/ui'

export default function EmployeeTrustedDevicesCard({ employeeId }: { employeeId: string }) {
  const [devices, setDevices] = useState<TrustedDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
    await updateTrustedDeviceStatus(employeeId, deviceId, 'TRUSTED')
    await load()
  }

  async function revoke(deviceId: string) {
    await updateTrustedDeviceStatus(employeeId, deviceId, 'REVOKED')
    await load()
  }

  return (
    <div className="tg-card shadow-2xs p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Appareils de confiance</h3>
        <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
          Téléphones autorisés pour le pointage mobile (QR, reprise pause).
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-gray-500">Chargement…</p>}

      {!loading && devices.length === 0 && (
        <p className="text-sm text-gray-500">Aucun appareil enregistré.</p>
      )}

      <ul className="space-y-3">
        {devices.map((d) => (
          <li
            key={d.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 dark:border-border-dark px-4 py-3"
          >
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {d.deviceLabel ?? d.platform}{' '}
                {d.sharedDevice && (
                  <span className="text-xs font-normal text-amber-600">(partagé)</span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {d.status} · dernière activité{' '}
                {new Date(d.lastSeenAt).toLocaleString('fr-FR')}
              </p>
            </div>
            <div className="flex gap-2">
              {d.status === 'PENDING' && (
                <button type="button" className={primaryBtnClass} onClick={() => void approve(d.id)}>
                  Approuver
                </button>
              )}
              {d.status !== 'REVOKED' && (
                <button type="button" className={secondaryBtnClass} onClick={() => void revoke(d.id)}>
                  Révoquer
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
