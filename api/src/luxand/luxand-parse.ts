/**
 * Best-effort parsing of Luxand.cloud JSON bodies (schema may vary by endpoint version).
 */

export function extractLuxandPersonUuid(body: Record<string, unknown>): string | null {
  const candidates = [body.uuid, body.id, body.person_uuid, (body.person as Record<string, unknown> | undefined)?.uuid];
  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 0) {
      return c;
    }
  }
  return null;
}

export function parseLuxandVerify(
  body: Record<string, unknown>,
  threshold01: number,
): { success: boolean; confidence: number | null } {
  if (body.status === 'error' || body.error || body.err) {
    return { success: false, confidence: null };
  }

  let confidence: number | null = null;
  const raw = body.probability ?? body.score ?? body.confidence ?? body.similarity ?? body.match_probability;
  if (typeof raw === 'number' && !Number.isNaN(raw)) {
    confidence = raw > 1 ? raw / 100 : raw;
  }

  if (body.verified === false || body.match === false || body.result === 'failure' || body.result === 'failed') {
    return { success: false, confidence };
  }
  if (body.verified === true || body.match === true || body.result === 'success' || body.result === 'ok') {
    return { success: true, confidence };
  }

  if (confidence != null) {
    return { success: confidence >= threshold01, confidence };
  }

  return { success: false, confidence };
}
