/**
 * Client HTTP unique du projet — fetch natif, pas d'axios.
 *
 * @example
 * import { http } from '@/lib/http'
 *
 * const admins = await http.get<Admin[]>('/admins/users')
 * await http.post('/admins/users', { email, password })
 *
 * Serveur (RSC, actions, routes) : session via `auth()`.
 * Client (composants `'use client'`) : session via `getSession()` à l'appel.
 */
import { HttpClient } from '@/lib/http/client'

export { HttpClient } from '@/lib/http/client'
export { HttpError, HttpSessionError } from '@/lib/http/errors'
export { getApiBaseUrl } from '@/lib/http/config'
export { parseResponse } from '@/lib/http/parse-response'
export {
  clearUnauthorizedSessionLock,
  notifyUnauthorizedSession,
  UNAUTHORIZED_SESSION_EVENT,
} from '@/lib/http/unauthorized-session'
export type {
  ApiEnvelope,
  HttpMethod,
  HttpQueryParams,
  HttpRequestOptions,
} from '@/lib/http/types'

/** Instance partagée — utiliser `http` partout. */
export const http = new HttpClient()
