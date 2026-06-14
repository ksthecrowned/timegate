'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import BrandLogo from '@/components/brand/BrandLogo'
import { activateSubscription } from '@/lib/auth/timegate-auth'
import { HttpError } from '@/lib/http'

export default function ActivatePage() {
  const router = useRouter()
  const { data: session, status, update } = useSession()
  const [activationKey, setActivationKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
    if (status === 'authenticated' && session?.user?.subscriptionActive) {
      router.replace('/')
    }
  }, [status, session, router])

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.accessToken) return

    setLoading(true)
    setError('')

    try {
      await activateSubscription(session.accessToken, activationKey.trim())
      await update({
        user: { ...session.user, subscriptionActive: true },
      })
      router.push('/')
      router.refresh()
    } catch (err) {
      const message =
        err instanceof HttpError
          ? err.message
          : 'Impossible d’activer l’abonnement.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-surface-dark">
        <p className="text-sm text-gray-600 dark:text-neutral-400">Chargement…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-secondary px-4">
      <div className="w-full max-w-md bg-surface-card dark:bg-surface-card-dark border border-slate-200/80 dark:border-border-dark rounded-xl shadow-xl p-6">
        <div className="flex justify-center mb-4">
          <BrandLogo variant="icon" tone="on-light" className="h-14 w-14" />
        </div>
        <h1 className="text-xl font-semibold text-center text-gray-900 dark:text-white">
          Activer votre abonnement
        </h1>
        <p className="mt-2 text-sm text-center text-gray-500 dark:text-neutral-400">
          Votre organisation n’a pas d’abonnement actif. Saisissez la clé d’activation
          fournie par TimeGate.
        </p>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleActivate} className="mt-6 space-y-4">
          <div>
            <label htmlFor="activationKey" className="block text-sm font-medium mb-2 dark:text-white">
              Clé d’activation
            </label>
            <input
              id="activationKey"
              type="text"
              className="input"
              placeholder="TMGT-DEMO-2026"
              value={activationKey}
              onChange={(e) => setActivationKey(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 font-semibold text-white rounded-md bg-gradient-to-r from-primary to-secondary text-sm hover:from-secondary hover:to-primary disabled:opacity-70"
          >
            {loading ? 'Activation…' : 'Activer'}
          </button>
        </form>
      </div>
    </div>
  )
}
