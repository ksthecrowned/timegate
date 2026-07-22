/** Enveloppe API legacy `{ statusCode, message, data }` (sans `meta`). */
export type ApiEnvelope<T> = {
  statusCode: number
  message: string
  data: T
}

/** Réponse paginée TimeGate API. */
export type PaginatedResponse<T> = {
  data: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type HttpQueryParams = Record<
  string,
  string | number | boolean | null | undefined
>

export type HttpRequestOptions = Omit<RequestInit, 'body' | 'method'> & {
  method?: HttpMethod
  /** Corps JSON (sérialisé) ou `FormData`. */
  body?: unknown
  /** Query string (`?page=1`). */
  params?: HttpQueryParams
  /** Ne pas envoyer de Bearer. */
  skipAuth?: boolean
  /** Token explicite (login NextAuth, callbacks JWT). */
  accessToken?: string | null
  /** Retourner la `Response` brute (fichiers, en-têtes, etc.). */
  raw?: boolean
}
