/**
 * Refresh is on by default once the API exposes POST /auth/refresh.
 * Set AUTH_REFRESH_ENABLED=false to force logout when the access JWT expires.
 */
export function isRefreshEnabled(): boolean {
  return process.env.AUTH_REFRESH_ENABLED !== 'false'
}

/** Aligné sur `JWT_EXPIRES_IN` côté api (défaut 8h = 28800s). */
export function getAccessTokenTtlSeconds(): number {
  const parsed = Number(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 28_800
}

export function getAccessTokenTtlMs(): number {
  return getAccessTokenTtlSeconds() * 1000
}

/** Aligné sur `JWT_REFRESH_EXPIRES_IN` côté api (défaut 30d). */
export function getRefreshTokenTtlSeconds(): number {
  const parsed = Number(process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2_592_000
}

/** Session NextAuth : durée du refresh token quand le refresh est actif. */
export function getSessionMaxAgeSeconds(): number {
  const override = Number(process.env.AUTH_SESSION_MAX_AGE_SECONDS)
  if (Number.isFinite(override) && override > 0) {
    return override
  }
  return isRefreshEnabled() ? getRefreshTokenTtlSeconds() : getAccessTokenTtlSeconds()
}

export function getRefreshBufferMs(): number {
  const seconds = Number(process.env.AUTH_REFRESH_BUFFER_SECONDS ?? 60)
  return seconds * 1000
}
