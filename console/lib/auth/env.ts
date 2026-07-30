export function getAccessTokenTtlSeconds(): number {
  const parsed = Number(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 28_800
}

export function getRefreshTokenTtlSeconds(): number {
  const parsed = Number(process.env.AUTH_REFRESH_TOKEN_TTL_SECONDS)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2_592_000
}

export function getSessionMaxAgeSeconds(): number {
  const override = Number(process.env.AUTH_SESSION_MAX_AGE_SECONDS)
  if (Number.isFinite(override) && override > 0) {
    return override
  }
  return isRefreshEnabled() ? getRefreshTokenTtlSeconds() : getAccessTokenTtlSeconds()
}

export function isRefreshEnabled(): boolean {
  return process.env.AUTH_REFRESH_ENABLED !== 'false'
}

export function getAccessTokenTtlMs(): number {
  return getAccessTokenTtlSeconds() * 1000
}
