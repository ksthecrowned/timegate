'use client'

import BrandLogo from '@/components/brand/BrandLogo'
import { signupTimeGate } from '@/lib/auth/timegate-auth'
import { HttpError } from '@/lib/http'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SignupPage() {
  const router = useRouter()
  const [organizationName, setOrganizationName] = useState('')
  const [sku, setSku] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await signupTimeGate({
        organizationName: organizationName.trim(),
        sku: sku.trim() || undefined,
        adminEmail: adminEmail.trim(),
        adminPassword,
      })

      const signInResult = await signIn('credentials', {
        email: adminEmail.trim(),
        password: adminPassword,
        sku: res.organization.sku,
        redirect: false,
      })

      if (signInResult?.error) {
        router.replace('/login')
        return
      }

      router.replace('/')
      router.refresh()
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Impossible de créer l\'organisation.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full min-h-screen overflow-auto bg-surface flex items-center justify-center dark:bg-surface-dark py-10 px-4">
      <div className="w-full max-w-md bg-surface-card dark:bg-surface-card-dark border border-slate-200/80 dark:border-border-dark rounded-xl shadow-xl p-6">
        <div className="flex justify-center mb-4">
          <BrandLogo variant="icon" tone="on-light" className="h-14 w-14" />
        </div>
        <h1 className="text-xl font-semibold text-center text-gray-900 dark:text-white">
          Créer mon organisation
        </h1>
        <p className="mt-2 text-sm text-center text-gray-500 dark:text-neutral-400">
          Essai gratuit — configurez TimeGate en quelques minutes.
        </p>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="organizationName" className="block text-sm font-medium mb-2 dark:text-white">
              Nom de l&apos;organisation
            </label>
            <input
              id="organizationName"
              className="input"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              required
              minLength={2}
            />
          </div>
          <div>
            <label htmlFor="sku" className="block text-sm font-medium mb-2 dark:text-white">
              Code organisation (SKU) — optionnel
            </label>
            <input
              id="sku"
              className="input"
              placeholder="Auto si vide"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              maxLength={20}
            />
          </div>
          <div>
            <label htmlFor="adminEmail" className="block text-sm font-medium mb-2 dark:text-white">
              E-mail administrateur
            </label>
            <input
              id="adminEmail"
              type="email"
              className="input"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="adminPassword" className="block text-sm font-medium mb-2 dark:text-white">
              Mot de passe
            </label>
            <input
              id="adminPassword"
              type="password"
              className="input"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 font-semibold text-white rounded-md bg-gradient-to-r from-primary to-secondary text-sm hover:from-secondary hover:to-primary disabled:opacity-70"
          >
            {loading ? 'Création…' : 'Démarrer l\'essai'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-neutral-400">
          Déjà un compte ?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
