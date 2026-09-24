'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import QRCode from 'qrcode'
import { HttpError } from '@/lib/http'
import {
  createPublicQrChallenge,
  getPublicClientMission,
  getPublicQrChallengeResult,
  type PublicClientMissionMeta,
} from '@/lib/timegate/client-missions'

type UiState = 'loading' | 'ready' | 'success' | 'error'

const POLL_MS = 1500

export default function PublicClientQrPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const [meta, setMeta] = useState<PublicClientMissionMeta | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [message, setMessage] = useState('Scannez avec l’app employé TimeGate')
  const [ui, setUi] = useState<UiState>('loading')
  const [error, setError] = useState('')
  const challengeIdRef = useRef<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const refreshing = useRef(false)

  const clearTimers = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  const refreshChallenge = useCallback(async () => {
    if (refreshing.current) return
    refreshing.current = true
    clearTimers()
    try {
      const challenge = await createPublicQrChallenge(slug)
      challengeIdRef.current = challenge.id
      const dataUrl = await QRCode.toDataURL(challenge.payload, {
        width: 280,
        margin: 1,
        errorCorrectionLevel: 'M',
      })
      setQrDataUrl(dataUrl)
      setUi('ready')
      setMessage('Scannez avec l’app employé TimeGate')

      const expiresAt = new Date(challenge.expiresAt).getTime()
      const tick = () => {
        const left = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
        setCountdown(left)
        if (left <= 0) {
          void refreshChallenge()
        }
      }
      tick()
      tickRef.current = setInterval(tick, 1000)

      pollRef.current = setInterval(() => {
        const id = challengeIdRef.current
        if (!id) return
        void getPublicQrChallengeResult(slug, id)
          .then((res) => {
            if (res.status === 'REDEEMED') {
              clearTimers()
              setUi('success')
              const msg =
                (res.result as { message?: string } | null)?.message ??
                'Pointage enregistré'
              setMessage(msg)
              setTimeout(() => {
                void refreshChallenge()
              }, 3000)
            } else if (res.status === 'EXPIRED') {
              void refreshChallenge()
            }
          })
          .catch(() => {
            /* ignore transient poll errors */
          })
      }, POLL_MS)
    } catch (err) {
      setUi('error')
      setError(err instanceof HttpError ? err.message : 'QR indisponible')
    } finally {
      refreshing.current = false
    }
  }, [slug, clearTimers])

  useEffect(() => {
    let cancelled = false
    void getPublicClientMission(slug)
      .then((m) => {
        if (cancelled) return
        setMeta(m)
        void refreshChallenge()
      })
      .catch((err) => {
        if (cancelled) return
        setUi('error')
        setError(err instanceof HttpError ? err.message : 'Lien invalide')
      })
    return () => {
      cancelled = true
      clearTimers()
    }
  }, [slug, refreshChallenge, clearTimers])

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-md text-center space-y-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">TimeGate</p>
          <h1 className="mt-2 text-2xl font-semibold">
            {meta?.title ?? 'Pointage client'}
          </h1>
          {meta && (
            <p className="mt-1 text-sm text-slate-400">
              {meta.clientLabel}
              {meta.companyName ? ` · ${meta.companyName}` : ''}
            </p>
          )}
        </div>

        {ui === 'error' && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {(ui === 'loading' || (ui === 'ready' && !qrDataUrl)) && (
          <p className="text-sm text-slate-400">Préparation du QR…</p>
        )}

        {qrDataUrl && ui !== 'error' && (
          <div className="mx-auto inline-block rounded-2xl bg-white p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR de pointage" width={280} height={280} />
          </div>
        )}

        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            ui === 'success'
              ? 'bg-emerald-500/15 text-emerald-200'
              : 'bg-white/5 text-slate-200'
          }`}
        >
          {message}
          {ui === 'ready' && countdown > 0 && (
            <span className="block mt-1 text-xs text-slate-400">
              Renouvellement dans {countdown}s
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
