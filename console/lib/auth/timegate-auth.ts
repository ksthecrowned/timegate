import { TIMEGATE_AUTH_ROUTES } from '@/lib/auth/constants'
import { http } from '@/lib/http'
import type { LoginResponse, TimeGateUser } from '@/lib/api/types'

export type LoginPayload = {
  email: string
  password: string
}

export function loginTimeGate(payload: LoginPayload): Promise<LoginResponse> {
  return http.post<LoginResponse>(TIMEGATE_AUTH_ROUTES.login, payload, { skipAuth: true })
}

export function fetchTimeGateMe(accessToken: string): Promise<TimeGateUser> {
  return http.get<TimeGateUser>(TIMEGATE_AUTH_ROUTES.me, { accessToken })
}

export async function logoutTimeGate(refreshToken?: string | null): Promise<void> {
  if (!refreshToken) return
  try {
    await http.post(TIMEGATE_AUTH_ROUTES.logout, { refresh_token: refreshToken }, { skipAuth: true })
  } catch {
    // Ignore revoke failures on sign-out.
  }
}
