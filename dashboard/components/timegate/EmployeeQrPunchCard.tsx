'use client'

import QRCode from 'qrcode'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  activateEmployeeQrPunch,
  fetchEmployeeQrPunchCurrent,
  revokeEmployeeQrPunch,
} from '@/lib/timegate/employee-identity'
import { HttpError } from '@/lib/http'
import { formatApiDate } from '@/lib/date-utils'
import { DetailCard } from './ui'

type Props = {
  employeeId: string
  employeeName: string
  hasQrPunchToken?: boolean
  qrPunchSecretIssuedAt?: string | null
  onUpdated?: () => void
}

export default function EmployeeQrPunchCard({
  employeeId,
  employeeName,
  hasQrPunchToken,
  qrPunchSecretIssuedAt,
  onUpdated,
}: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const refreshQr = useCallback(async () => {
    if (!hasQrPunchToken) return
    setLoading(true)
    setError('')
    try {
      const res = await fetchEmployeeQrPunchCurrent(employeeId)
      const dataUrl = await QRCode.toDataURL(res.qrPayload, { width: 220, margin: 1 })
      setQrDataUrl(dataUrl)
      setExpiresAt(res.expiresAt)
      const ms = new Date(res.expiresAt).getTime() - Date.now() + 500
      clearTimer()
      timerRef.current = setTimeout(() => {
        void refreshQr()
      }, Math.max(ms, 5000))
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Impossible de charger le QR')
      setQrDataUrl(null)
    } finally {
      setLoading(false)
    }
  }, [employeeId, hasQrPunchToken])

  useEffect(() => {
    if (hasQrPunchToken) void refreshQr()
    return clearTimer
  }, [hasQrPunchToken, refreshQr])

  async function activate() {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const res = await activateEmployeeQrPunch(employeeId)
      const dataUrl = await QRCode.toDataURL(res.qrPayload, { width: 220, margin: 1 })
      setQrDataUrl(dataUrl)
      setExpiresAt(res.expiresAt)
      setMessage('QR de pointage activé. Le code change automatiquement chaque minute.')
      const ms = new Date(res.expiresAt).getTime() - Date.now() + 500
      clearTimer()
      timerRef.current = setTimeout(() => {
        void refreshQr()
      }, Math.max(ms, 5000))
      onUpdated?.()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Activation impossible')
    } finally {
      setLoading(false)
    }
  }

  async function revoke() {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      await revokeEmployeeQrPunch(employeeId)
      clearTimer()
      setQrDataUrl(null)
      setExpiresAt(null)
      setMessage('QR de pointage révoqué.')
      onUpdated?.()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Révocation impossible')
    } finally {
      setLoading(false)
    }
  }

  function printQr() {
    if (!qrDataUrl) return
    const win = window.open('', '_blank', 'width=420,height=520')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html><html><head><title>QR pointage — ${employeeName}</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:24px">
        <h1 style="font-size:18px">${employeeName}</h1>
        <p style="color:#666;font-size:13px">TimeGate — QR rotatif (valide ~1 min au moment de l'impression)</p>
        <img src="${qrDataUrl}" width="220" height="220" alt="QR pointage" />
        <p style="font-size:11px;color:#999">Imprimé le ${new Date().toLocaleString('fr-FR')}</p>
      </body></html>
    `)
    win.document.close()
    win.focus()
    win.print()
  }

  return (
    <DetailCard title="QR de pointage">
      <div className="px-5 py-4 flex flex-col gap-4">
        <p className="text-sm text-gray-500 dark:text-neutral-400">
          Code rotatif renouvelé <strong>chaque minute</strong>. L’employé présente son téléphone ou
          une impression récente au kiosk.
          {hasQrPunchToken && qrPunchSecretIssuedAt
            ? ` Activé le ${formatApiDate(qrPunchSecretIssuedAt)}.`
            : ' Non activé.'}
        </p>

        {hasQrPunchToken && qrDataUrl ? (
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR pointage employé" className="rounded-lg border dark:border-neutral-700" width={220} height={220} />
            <div className="text-sm text-gray-600 dark:text-neutral-400">
              {loading ? 'Actualisation…' : null}
              {expiresAt ? (
                <p>Prochain renouvellement : {new Date(expiresAt).toLocaleTimeString('fr-FR')}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

        <div className="flex flex-wrap gap-2">
          {!hasQrPunchToken ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => void activate()}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Activer le QR
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={loading || !qrDataUrl}
                onClick={() => void refreshQr()}
                className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-700"
              >
                Actualiser
              </button>
              <button
                type="button"
                disabled={!qrDataUrl}
                onClick={printQr}
                className="rounded-lg border px-3 py-2 text-sm dark:border-neutral-700"
              >
                Imprimer / PDF
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void revoke()}
                className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:text-red-400"
              >
                Révoquer
              </button>
            </>
          )}
        </div>
      </div>
    </DetailCard>
  )
}
