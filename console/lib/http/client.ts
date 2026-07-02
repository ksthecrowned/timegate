import { resolveAccessToken } from '@/lib/http/access-token'
import { getApiBaseUrl } from '@/lib/http/config'
import { parseResponse } from '@/lib/http/parse-response'
import type { HttpMethod, HttpQueryParams, HttpRequestOptions } from '@/lib/http/types'

type TokenResolver = () => Promise<string | null | undefined>

export class HttpClient {
  constructor(
    private readonly resolveToken: TokenResolver = resolveAccessToken,
    private readonly baseUrl: string = getApiBaseUrl(),
  ) {}

  private buildUrl(path: string, params?: HttpQueryParams): string {
    const normalized = path.startsWith('/') ? path : `/${path}`
    const url = new URL(`${this.baseUrl}${normalized}`)

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined) continue
        url.searchParams.set(key, String(value))
      }
    }

    return url.toString()
  }

  private serializeBody(body: unknown): BodyInit | undefined {
    if (body === undefined) return undefined
    if (body instanceof FormData || body instanceof URLSearchParams) return body
    if (typeof body === 'string') return body
    return JSON.stringify(body)
  }

  async request<T>(path: string, options: HttpRequestOptions = {}): Promise<T> {
    const {
      params,
      body,
      skipAuth,
      accessToken,
      raw,
      method = 'GET',
      headers: initHeaders,
      cache = 'no-store',
      ...init
    } = options

    const headers = new Headers(initHeaders)

    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json')
    }

    const serialized = this.serializeBody(body)
    if (
      serialized !== undefined &&
      !(serialized instanceof FormData) &&
      !headers.has('Content-Type')
    ) {
      headers.set('Content-Type', 'application/json')
    }

    const token =
      accessToken !== undefined
        ? accessToken
        : skipAuth
          ? null
          : await this.resolveToken()

    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }

    const res = await fetch(this.buildUrl(path, params), {
      ...init,
      method,
      headers,
      body: serialized,
      cache,
    })

    if (raw) {
      return res as T
    }

    return parseResponse<T>(res)
  }

  get<T>(path: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  post<T>(
    path: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ) {
    return this.request<T>(path, { ...options, method: 'POST', body })
  }

  patch<T>(
    path: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ) {
    return this.request<T>(path, { ...options, method: 'PATCH', body })
  }

  delete<T>(path: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>) {
    return this.request<T>(path, { ...options, method: 'DELETE' })
  }
}

export const http = new HttpClient()
