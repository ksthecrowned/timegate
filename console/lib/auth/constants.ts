export const REFRESH_TOKEN_ERROR = 'RefreshAccessTokenError' as const

export const TIMEGATE_AUTH_ROUTES = {
  login: '/auth/login',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
  me: '/auth/me',
} as const
