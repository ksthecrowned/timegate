import { HttpError } from '@/lib/http/errors'
import type { ApiEnvelope } from '@/lib/http/types'

function extractMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined
  if ('message' in payload) {
    const msg = (payload as { message?: unknown }).message
    if (typeof msg === 'string') return msg
    if (Array.isArray(msg)) return msg.map(String).join(', ')
  }
  return undefined
}

function isLegacyApiEnvelope(payload: object): payload is ApiEnvelope<unknown> {
  return 'statusCode' in payload && 'message' in payload && 'data' in payload && !('meta' in payload)
}

/** Parse JSON TimeGate (déballe aussi l'enveloppe legacy si présente). */
export async function parseResponse<T>(res: Response): Promise<T> {
  const contentType = res.headers.get('content-type') ?? ''
  const isJson = contentType.includes('application/json')

  if (res.status === 204) {
    return undefined as T
  }

  const payload: unknown = isJson ? await res.json() : await res.text()

  if (!res.ok) {
    throw new HttpError(
      extractMessage(payload) ?? res.statusText ?? 'Erreur API',
      res.status,
      payload,
    )
  }

  if (isJson && payload && typeof payload === 'object') {
    if (isLegacyApiEnvelope(payload)) {
      return payload.data as T
    }
  }

  return payload as T
}
