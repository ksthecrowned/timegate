import type { DefaultSession } from 'next-auth'
import type { DefaultJWT } from 'next-auth/jwt'
import type { TimeGateRole } from '@/lib/timegate/types'

export type TimeGateSessionUser = {
  id: string
  email: string
  role: TimeGateRole
  companyId: string | null
  subscriptionActive: boolean
}

declare module 'next-auth' {
  interface Session {
    user: TimeGateSessionUser & DefaultSession['user']
    accessToken?: string
    error?: 'RefreshAccessTokenError'
  }

  interface User extends TimeGateSessionUser {
    accessToken: string
    accessTokenExpires: number
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    user?: TimeGateSessionUser
    accessToken?: string
    accessTokenExpires?: number
    error?: 'RefreshAccessTokenError'
  }
}

/** @deprecated Alias legacy ride-api */
export type RideAdminUser = TimeGateSessionUser
