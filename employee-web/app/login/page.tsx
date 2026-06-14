'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getApiBaseUrl, isAuthenticated, loginEmployee } from '@/lib/auth'
import { ErrorBanner, PrimaryButton } from '@/components/ui'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace('/')
      return
    }
    setLoading(false)
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await loginEmployee(email, password)
      router.replace('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-accent" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8">
      <div className="mb-8 mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">TimeGate</p>
        <h1 className="mt-2 text-3xl font-extrabold">Espace employé</h1>
        <p className="mt-2 text-sm text-text-muted">
          Consultez vos pointages et demandez des congés.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <p className="mt-3 text-[11px] text-white/35">API : {getApiBaseUrl()}</p>
        )}
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-1 flex-col gap-4">
        <ErrorBanner message={error} />

        <label className="block text-sm font-semibold text-white/90">
          Email
          <input
            type="email"
            className="mt-1.5"
            placeholder="patrick.mukendi@sotrafer.cg"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label className="block text-sm font-semibold text-white/90">
          Mot de passe
          <input
            type="password"
            className="mt-1.5"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        <div className="mt-4">
          <PrimaryButton type="submit" disabled={submitting}>
            {submitting ? 'Connexion…' : 'Se connecter'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  )
}
