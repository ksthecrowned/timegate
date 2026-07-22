/** Clé d'erreur session quand le refresh token a échoué. */
export const REFRESH_TOKEN_ERROR = 'RefreshAccessTokenError' as const

/** Routes auth TimeGate (`/api/v1/auth/*`). */
export const TIMEGATE_AUTH_ROUTES = {
  login: '/auth/login',
  employeeLogin: '/auth/employee/login',
  me: '/auth/me',
  subscriptionStatus: '/auth/subscription-status',
  activate: '/auth/activate',
  signup: '/auth/signup',
} as const
