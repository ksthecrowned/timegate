import { getApiBaseUrl } from '@/lib/http/config'

export function getAccessTokenTtlSeconds(): number {
  const parsed = Number(process.env.AUTH_ACCESS_TOKEN_TTL_SECONDS)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 28_800
}

export function getSessionMaxAgeSeconds(): number {
  const override = Number(process.env.AUTH_SESSION_MAX_AGE_SECONDS)
  if (Number.isFinite(override) && override > 0) {
    return override
  }
  return getAccessTokenTtlSeconds()
}

export function isRefreshEnabled(): boolean {
  return process.env.AUTH_REFRESH_ENABLED === 'true'
}

export function getAccessTokenTtlMs(): number {
  return getAccessTokenTtlSeconds() * 1000
}
