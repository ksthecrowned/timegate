/** Base URL TimeGate API (ex. `http://localhost:4001/api/v1`). */
export function getApiBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_TIMEGATE_API_URL ??
    process.env.TIMEGATE_API_URL ??
    'http://localhost:4001/api/v1'
  return fromEnv.replace(/\/$/, '')
}
