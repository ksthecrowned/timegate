'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import BrandLogo from '@/components/brand/BrandLogo'
import {
  activateSubscription,
  fetchSubscriptionStatus,
} from '@/lib/auth/timegate-auth'
import { mapSubscriptionSessionFields } from '@/lib/auth/subscription-session'
import { HttpError } from '@/lib/http'
import type { SubscriptionStatus } from '@/lib/timegate/types'
import { formatApiDate } from '@/lib/date-utils'

function statusTitle(status: SubscriptionStatus['status']): string {
  switch (status) {
    case 'TRIAL':
      return 'Essai en cours'
    case 'GRACE_READ_ONLY':
      return 'Lecture seule — grâce'
    case 'BLOCKED':
      return 'Abonnement expiré'
    case 'SUSPENDED':
      return 'Organisation suspendue'
    case 'ACTIVE':
      return 'Abonnement actif'
    default:
      return 'Statut abonnement'
  }
}

export default function ActivatePage() {
  const router = useRouter()
  const { data: session, status, update } = useSession()
  const [activationKey, setActivationKey] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated' || !session?.accessToken) return
    if (
      session.user.subscriptionActive &&
      !session.user.subscriptionReadOnly &&
      !session.user.subscriptionBlocked &&
      session.user.subscriptionStatus === 'ACTIVE'
    ) {
      router.replace('/')
      return
    }
    fetchSubscriptionStatus(session.accessToken)
      .then(setSubscription)
      .catch(() => undefined)
  }, [status, session, router])

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session?.accessToken) return

    setLoading(true)
    setError('')

    try {
      await activateSubscription(session.accessToken, activationKey.trim())
      const fresh = await fetchSubscriptionStatus(session.accessToken)
      await update({
        user: {
          ...session.user,
          ...mapSubscriptionSessionFields(fresh),
        },
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

  const sub = subscription?.subscription

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary to-secondary px-4 py-10">
      <div className="w-full max-w-md bg-surface-card dark:bg-surface-card-dark border border-slate-200/80 dark:border-border-dark rounded-xl shadow-xl p-6">
        <div className="flex justify-center mb-4">
          <BrandLogo variant="icon" tone="on-light" className="h-14 w-14" />
        </div>
        <h1 className="text-xl font-semibold text-center text-gray-900 dark:text-white">
          {statusTitle(subscription?.status ?? session?.user.subscriptionStatus ?? null)}
        </h1>
        <p className="mt-2 text-sm text-center text-gray-500 dark:text-neutral-400">
          {subscription?.readOnly
            ? 'Votre accès est en lecture seule. Activez une clé pour prolonger ou upgrader.'
            : subscription?.blocked
              ? 'Votre organisation ne peut plus utiliser TimeGate. Saisissez une clé d’activation.'
              : subscription?.status === 'TRIAL' ||
                  session?.user.subscriptionStatus === 'TRIAL'
                ? 'Vous êtes en essai gratuit. Saisissez une clé d’activation pour passer à un plan payant.'
                : 'Saisissez la clé d’activation fournie par TimeGate pour prolonger ou activer votre plan.'}
        </p>

        {sub && (
          <div className="mt-4 rounded-lg border border-slate-200 dark:border-neutral-700 p-3 text-sm space-y-1">
            <p>
              <span className="text-gray-500 dark:text-neutral-400">Plan : </span>
              <span className="font-medium">{sub.plan}</span>
            </p>
            {sub.expiresAt ? (
              <p>
                <span className="text-gray-500 dark:text-neutral-400">Expire le : </span>
                {formatApiDate(sub.expiresAt)}
                {sub.daysUntilExpiry != null ? ` (${sub.daysUntilExpiry} j)` : ''}
              </p>
            ) : null}
            {sub.usage ? (
              <p className="text-gray-600 dark:text-neutral-300">
                {sub.usage.employees}/{sub.usage.maxEmployees} employés ·{' '}
                {sub.usage.kiosks}/{sub.usage.maxKiosks} kiosks
              </p>
            ) : null}
          </div>
        )}

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
              placeholder="TMGT-XXXXXXXX"
              value={activationKey}
              onChange={(e) => setActivationKey(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 font-semibold text-white rounded-md bg-linear-to-r from-primary to-secondary text-sm hover:from-secondary hover:to-primary disabled:opacity-70"
          >
            {loading ? 'Activation…' : 'Activer'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          <Link href="/subscriptions" className="text-primary font-semibold hover:underline">
            Détails abonnement
          </Link>
        </p>
      </div>
    </div>
  )
}
