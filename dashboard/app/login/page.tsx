'use client'

import Link from 'next/link'
import BrandLogo from '@/components/brand/BrandLogo'
import { SwitcherField } from '@/components/ui/FormField'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [sessionExpired, setSessionExpired] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sku, setSku] = useState('SOTR')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setSessionExpired(params.get('error') === 'SessionExpired')
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        sku: sku.trim() || undefined,
        redirect: false,
      })

      if (result?.error) {
        setError('Identifiants invalides ou organisation incorrecte.')
        return
      }

      router.replace('/')
    } catch {
      setError('Impossible de contacter TimeGate API. Vérifiez NEXT_PUBLIC_TIMEGATE_API_URL.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-screen overflow-hidden bg-surface flex items-center justify-center dark:bg-surface-dark">
      <div className="container w-full mx-auto px-4">
        <div className="grid md:grid-cols-2 w-full md:w-3/4 lg:w-[60%] mx-auto my-16 shadow-2xl rounded-xl overflow-hidden">
          <div className="hidden md:flex w-full min-h-[520px] flex-col items-center justify-center bg-gradient-to-br from-primary to-secondary px-8">
            <BrandLogo variant="full" tone="on-dark" className="max-w-[280px]" priority />
            <p className="mt-8 text-center text-sm font-medium tracking-[0.2em] text-white/80 uppercase">
              HR Software · Time &amp; Attendance
            </p>
          </div>

          <div className="px-5 bg-surface-card dark:bg-surface-card-dark">
            <div className="flex flex-col justify-center min-h-full px-6 py-12">
              <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <div className="mx-auto flex justify-center">
                  <BrandLogo variant="icon" tone="on-light" className="h-14 w-14" priority />
                </div>
                <h2 className="mt-4 font-semibold tracking-tight text-center text-gray-900 dark:text-white text-2xl">
                  TimeGate
                </h2>
                <p className="mt-1 text-center text-sm text-gray-500 dark:text-neutral-400">
                  Connexion administrateur
                </p>
              </div>

              <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-sm">
                {sessionExpired && !error && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300">
                    Votre session a expiré. Veuillez vous reconnecter.
                  </div>
                )}

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                    {error}
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2 dark:text-white">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="input"
                      placeholder="admin@monorganisation.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium mb-2 dark:text-white">
                      Mot de passe
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        className="input pr-10"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300"
                        aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      >
                        <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-sm`} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="sku" className="block text-sm font-medium mb-2 dark:text-white">
                      Organisation (SKU)
                    </label>
                    <input
                      type="text"
                      id="sku"
                      className="input"
                      placeholder="SOTR"
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                    />
                  </div>

                  <SwitcherField
                    label="Se souvenir de moi"
                    checked={rememberMe}
                    onCheckedChange={setRememberMe}
                    className="py-1"
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center w-full px-4 py-3 font-semibold text-white rounded-md shadow-xs gap-x-2 bg-gradient-to-r from-primary to-secondary text-sm hover:from-secondary hover:to-primary disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {loading && <i className="fa-solid fa-spinner fa-spin" />}
                    Se connecter
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-500 dark:text-neutral-400">
                  Pas encore de compte ?{' '}
                  <Link href="/signup" className="font-semibold text-primary hover:underline">
                    Créer une organisation
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
