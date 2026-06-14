/** @deprecated Utiliser `@/lib/auth/timegate-auth` */
export {
  activateSubscription,
  fetchSubscriptionStatus,
  fetchTimeGateMe,
  loginAdmin,
  loginTimeGate,
  logoutAdmin,
} from '@/lib/auth/timegate-auth'

export type { LoginPayload } from '@/lib/auth/timegate-auth'

export async function refreshAdminTokens(_refreshToken: string): Promise<never> {
  throw new Error('TimeGate API ne supporte pas encore le refresh token')
}

export async function fetchAdminMe(accessToken: string) {
  const me = await import('@/lib/auth/timegate-auth').then((m) => m.fetchTimeGateMe(accessToken))
  return {
    id: me.id,
    email: me.email,
    roleTitle: me.role,
  }
}
