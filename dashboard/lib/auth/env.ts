/**
 * TMGT n'expose pas POST /auth/refresh.
 * Tant que false : à l'expiration du JWT API, déconnexion → /login?error=SessionExpired.
 */
export function isRefreshEnabled(): boolean {
  return process.env.AUTH_REFRESH_ENABLED === 'true'
}

/** Aligné sur `JWT_EXPIRES_IN` côté api (défaut 8h = 28800s). */
export function getAccessTokenTtlSeconds(): number {
  const parsed = Number(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 28_800
}

export function getAccessTokenTtlMs(): number {
  return getAccessTokenTtlSeconds() * 1000
}

/** Session NextAuth calée sur la durée du JWT (pas de prolongation sans refresh). */
export function getSessionMaxAgeSeconds(): number {
  const override = Number(process.env.AUTH_SESSION_MAX_AGE_SECONDS)
  if (Number.isFinite(override) && override > 0) {
    return override
  }
  return getAccessTokenTtlSeconds()
}

export function getRefreshBufferMs(): number {
  const seconds = Number(process.env.AUTH_REFRESH_BUFFER_SECONDS ?? 300)
  return seconds * 1000
}
