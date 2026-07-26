'use client'

import BrandLogo from '@/components/brand/BrandLogo'
import { signupTimeGate } from '@/lib/auth/timegate-auth'
import { HttpError } from '@/lib/http'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const ORGANIZATION_SIZES = [
  { value: '1-10', label: '1 – 10 salariés' },
  { value: '11-50', label: '11 – 50 salariés' },
  { value: '51-200', label: '51 – 200 salariés' },
  { value: '201-500', label: '201 – 500 salariés' },
  { value: '500+', label: 'Plus de 500 salariés' },
] as const

const CONTACT_ROLES = [
  { value: 'founder', label: 'Fondateur / Dirigeant' },
  { value: 'executive', label: 'Direction' },
  { value: 'hr', label: 'RH / DRH' },
  { value: 'manager', label: 'Manager / Responsable' },
  { value: 'operations', label: 'Opérations / IT' },
  { value: 'other', label: 'Autre' },
] as const

export default function SignupPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [contactRole, setContactRole] = useState('')
  const [organizationSize, setOrganizationSize] = useState('')
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
        organizationSize: organizationSize as (typeof ORGANIZATION_SIZES)[number]['value'],
        contactRole: contactRole as (typeof CONTACT_ROLES)[number]['value'],
        adminEmail: adminEmail.trim(),
        adminPassword,
        adminFirstName: firstName.trim(),
        adminLastName: lastName.trim(),
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
      setError(err instanceof HttpError ? err.message : "Impossible de créer l'organisation.")
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium mb-2 dark:text-white">
                Nom
              </label>
              <input
                id="lastName"
                className="input"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                minLength={1}
              />
            </div>
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium mb-2 dark:text-white">
                Prénom
              </label>
              <input
                id="firstName"
                className="input"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                minLength={1}
              />
            </div>
          </div>

          <div>
            <label htmlFor="adminEmail" className="block text-sm font-medium mb-2 dark:text-white">
              E-mail
            </label>
            <input
              id="adminEmail"
              type="email"
              className="input"
              autoComplete="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label
              htmlFor="organizationName"
              className="block text-sm font-medium mb-2 dark:text-white"
            >
              Nom de l&apos;organisation
            </label>
            <input
              id="organizationName"
              className="input"
              autoComplete="organization"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              required
              minLength={2}
            />
          </div>

          <div>
            <label htmlFor="contactRole" className="block text-sm font-medium mb-2 dark:text-white">
              Votre rôle
            </label>
            <select
              id="contactRole"
              className="input"
              value={contactRole}
              onChange={(e) => setContactRole(e.target.value)}
              required
            >
              <option value="" disabled>
                Sélectionner…
              </option>
              {CONTACT_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="organizationSize"
              className="block text-sm font-medium mb-2 dark:text-white"
            >
              Taille de l&apos;organisation
            </label>
            <select
              id="organizationSize"
              className="input"
              value={organizationSize}
              onChange={(e) => setOrganizationSize(e.target.value)}
              required
            >
              <option value="" disabled>
                Sélectionner…
              </option>
              {ORGANIZATION_SIZES.map((size) => (
                <option key={size.value} value={size.value}>
                  {size.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="adminPassword"
              className="block text-sm font-medium mb-2 dark:text-white"
            >
              Mot de passe
            </label>
            <input
              id="adminPassword"
              type="password"
              className="input"
              autoComplete="new-password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
              minLength={8}
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-neutral-400">
              Au moins 8 caractères — pour accéder à votre espace.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 font-semibold text-white rounded-md bg-linear-to-r from-primary to-secondary text-sm hover:from-secondary hover:to-primary disabled:opacity-70"
          >
            {loading ? 'Création…' : "Démarrer l'essai"}
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
