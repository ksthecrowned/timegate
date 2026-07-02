import { getAccessTokenTtlMs } from '@/lib/auth/env'

export function getAccessTokenExpiry(accessToken: string): number {
  try {
    const part = accessToken.split('.')[1]
    if (!part) throw new Error('invalid jwt')

    const base64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const json = JSON.parse(
      typeof Buffer !== 'undefined'
        ? Buffer.from(padded, 'base64').toString('utf8')
        : atob(padded),
    ) as { exp?: number }

    if (typeof json.exp === 'number') {
      return json.exp * 1000
    }
  } catch {
    // ignore
  }

  return Date.now() + getAccessTokenTtlMs()
}
