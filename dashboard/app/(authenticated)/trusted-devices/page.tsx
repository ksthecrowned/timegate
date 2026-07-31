'use client'

import { formatApiDateTime } from '@/lib/date-utils'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '@/components/ui/PageHeader'
import { ApiErrorBanner, primaryBtnClass, secondaryBtnClass } from '@/components/timegate/ui'
import {
  listPendingTrustedDevices,
  updateTrustedDeviceStatus,
  type TrustedDevice,
} from '@/lib/timegate/trusted-devices'
import { HttpError } from '@/lib/http'

export default function TrustedDevicesPage() {
  const [devices, setDevices] = useState<TrustedDevice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await listPendingTrustedDevices()
      setDevices(res.data)
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Chargement impossible.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function approve(device: TrustedDevice) {
    if (!device.employee?.id) return
    await updateTrustedDeviceStatus(device.employee.id, device.id, 'TRUSTED')
    await load()
  }

  async function revoke(device: TrustedDevice) {
    if (!device.employee?.id) return
    await updateTrustedDeviceStatus(device.employee.id, device.id, 'REVOKED')
    await load()
  }

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Administration' },
          { label: 'Téléphones employés' },
        ]}
      />

      <p className="mb-4 text-sm text-gray-500 dark:text-neutral-400">
        Approuvez les téléphones pour le pointage mobile. Les bornes physiques sont dans{' '}
        <a href="/kiosks" className="text-primary hover:underline">
          Bornes / kiosques
        </a>
        .
      </p>

      <ApiErrorBanner message={error} />

      {loading ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : devices.length === 0 ? (
        <div className="tg-card shadow-2xs p-8 text-center text-sm text-gray-500">
          Aucun appareil en attente.
        </div>
      ) : (
        <ul className="space-y-3">
          {devices.map((d) => (
            <li key={d.id} className="tg-card shadow-2xs p-4 flex flex-wrap justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {d.employee?.name ?? 'Employé'}
                </p>
                <p className="text-sm text-gray-500">{d.employee?.email}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {d.platform}
                  {d.sharedDevice ? ' · appareil partagé' : ''} ·{' '}
                  {formatApiDateTime(d.lastSeenAt)}
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <button type="button" className={primaryBtnClass} onClick={() => void approve(d)}>
                  Approuver
                </button>
                <button type="button" className={secondaryBtnClass} onClick={() => void revoke(d)}>
                  Refuser
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
