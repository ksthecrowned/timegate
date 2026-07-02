import type { DefaultSession } from 'next-auth'
import type { DefaultJWT } from 'next-auth/jwt'
import type { TimeGateRole } from '@/lib/api/types'

export type SuperAdminSessionUser = {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
  role: TimeGateRole
  companyId: string | null
}

declare module 'next-auth' {
  interface Session {
    user: SuperAdminSessionUser & DefaultSession['user']
    accessToken?: string
    error?: 'RefreshAccessTokenError'
  }

  interface User extends SuperAdminSessionUser {
    accessToken: string
    accessTokenExpires: number
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    user?: SuperAdminSessionUser
    accessToken?: string
    accessTokenExpires?: number
    error?: 'RefreshAccessTokenError'
  }
}
