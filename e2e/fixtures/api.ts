const API = process.env.TIMEGATE_API_URL ?? 'http://127.0.0.1:4001/api/v1'
const PASS = process.env.TIMEGATE_TEST_PASSWORD ?? 'ChangeMe123!'

export async function loginAdmin() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      email: 'admin@monorganisation.com',
      password: PASS,
      sku: 'SOTR',
    }),
  })
  const json = (await res.json()) as { access_token?: string }
  return json.access_token ?? ''
}
