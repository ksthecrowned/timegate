/**
 * Chemin relatif interne uniquement — évite les open redirects via ?callbackUrl=.
 */
export function safeCallbackUrl(value: string | null | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null
  if (trimmed === '/login' || trimmed.startsWith('/login?')) return null
  if (trimmed === '/signup' || trimmed.startsWith('/signup?')) return null
  if (trimmed === '/activate' || trimmed.startsWith('/activate?')) return null
  return trimmed
}
