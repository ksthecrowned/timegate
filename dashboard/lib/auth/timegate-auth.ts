import { TIMEGATE_AUTH_ROUTES } from '@/lib/auth/constants'
import { http } from '@/lib/http'
import type {
  LoginResponse,
  SignupResponse,
  SubscriptionStatus,
  TimeGateUser,
} from '@/lib/timegate/types'

export type SignupPayload = {
  organizationName: string
  sku?: string
  adminEmail: string
  adminPassword: string
  adminFirstName?: string
  adminLastName?: string
}

export type LoginPayload = {
  email: string
  password: string
  sku?: string
}

/** POST /auth/signup */
export function signupTimeGate(payload: SignupPayload): Promise<SignupResponse> {
  return http.post<SignupResponse>(TIMEGATE_AUTH_ROUTES.signup, payload, { skipAuth: true })
}

/** POST /auth/login */
export function loginTimeGate(payload: LoginPayload): Promise<LoginResponse> {
  return http.post<LoginResponse>(TIMEGATE_AUTH_ROUTES.login, payload, { skipAuth: true })
}

/** POST /auth/employee/login */
export function loginEmployeeTimeGate(payload: {
  email: string
  password: string
}): Promise<LoginResponse> {
  return http.post<LoginResponse>(TIMEGATE_AUTH_ROUTES.employeeLogin, payload, { skipAuth: true })
}

/** GET /auth/me */
export function fetchTimeGateMe(accessToken: string): Promise<TimeGateUser> {
  return http.get<TimeGateUser>(TIMEGATE_AUTH_ROUTES.me, { accessToken })
}

/** GET /auth/subscription-status */
export function fetchSubscriptionStatus(accessToken: string): Promise<SubscriptionStatus> {
  return http.get<SubscriptionStatus>(TIMEGATE_AUTH_ROUTES.subscriptionStatus, { accessToken })
}

/** POST /auth/activate */
export function activateSubscription(
  accessToken: string,
  activationKey: string,
): Promise<SubscriptionStatus> {
  return http.post<SubscriptionStatus>(
    TIMEGATE_AUTH_ROUTES.activate,
    { activationKey },
    { accessToken },
  )
}

/** @deprecated Alias legacy */
export const loginAdmin = (email: string, password: string, sku?: string) =>
  loginTimeGate({ email, password, sku })

export async function logoutAdmin(): Promise<void> {
  // TimeGate n'expose pas de route logout — session JWT côté client uniquement.
}
