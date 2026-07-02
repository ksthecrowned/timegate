export type ApiEnvelope<T> = {
  statusCode: number
  message: string
  data: T
}

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
  body?: unknown
  params?: HttpQueryParams
  skipAuth?: boolean
  accessToken?: string | null
  raw?: boolean
}
