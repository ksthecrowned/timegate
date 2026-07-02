import NextAuth from 'next-auth'
import type { JWT } from 'next-auth/jwt'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from '@/auth.config'
import { REFRESH_TOKEN_ERROR } from '@/lib/auth/constants'
import { getAccessTokenExpiry } from '@/lib/auth/jwt-utils'
import {
  refreshAccessToken,
  shouldRefreshAccessToken,
} from '@/lib/auth/refresh-access-token'
import { isRefreshEnabled } from '@/lib/auth/env'
import { fetchTimeGateMe, loginTimeGate } from '@/lib/auth/timegate-auth'
import type { TimeGateRole } from '@/lib/api/types'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Super admin',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email
        const password = credentials?.password
        if (typeof email !== 'string' || typeof password !== 'string') {
          return null
        }

        try {
          const login = await loginTimeGate({
            email: email.trim(),
            password,
          })

          const accessToken = login.access_token
          const me = await fetchTimeGateMe(accessToken)

          if (me.role !== 'SUPER_ADMIN') {
            return null
          }

          return {
            id: me.id,
            email: me.email,
            firstName: me.firstName,
            lastName: me.lastName,
            role: me.role as TimeGateRole,
            companyId: me.companyId,
            accessToken,
            accessTokenExpires: getAccessTokenExpiry(accessToken),
          }
        } catch (error) {
          console.error('[console auth] login failed:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }): Promise<JWT> {
      if (user) {
        return {
          ...token,
          user: {
            id: user.id!,
            email: user.email!,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            companyId: user.companyId,
          },
          accessToken: user.accessToken,
          accessTokenExpires: user.accessTokenExpires,
        }
      }

      if (
        token.accessTokenExpires &&
        !shouldRefreshAccessToken(token.accessTokenExpires)
      ) {
        return token
      }

      if (isRefreshEnabled() && token.accessToken) {
        return refreshAccessToken(token)
      }

      if (token.accessTokenExpires && Date.now() >= token.accessTokenExpires) {
        return { ...token, error: REFRESH_TOKEN_ERROR }
      }

      return token
    },
  },
})
