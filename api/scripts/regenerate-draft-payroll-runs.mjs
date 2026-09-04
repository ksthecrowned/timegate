/**
 * Regenerate all DRAFT payroll runs via the local API.
 * Usage: bun run scripts/regenerate-draft-payroll-runs.mjs
 */
const BASE = process.env.TIMEGATE_API_URL ?? 'http://127.0.0.1:4001/api/v1'
const EMAIL = process.env.TIMEGATE_ADMIN_EMAIL ?? 'admin@sotrafer.cg'
const PASS = process.env.TIMEGATE_TEST_PASSWORD ?? 'ChangeMe123!'
const SKU = process.env.TIMEGATE_ORG_SKU ?? 'SOTR'

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }
  if (!res.ok) {
    const msg = json?.message ?? text ?? res.statusText
    throw new Error(`${method} ${path} → ${res.status}: ${Array.isArray(msg) ? msg.join(', ') : msg}`)
  }
  return json
}

async function main() {
  console.log(`API: ${BASE}`)
  const login = await request('/auth/login', {
    method: 'POST',
    body: { email: EMAIL, password: PASS, sku: SKU },
  })
  const token = login.access_token ?? login.accessToken ?? login.token
  if (!token) throw new Error('Login succeeded but no access token returned')

  const [draftListed, lockedListed] = await Promise.all([
    request('/payroll-runs?status=DRAFT&limit=100', { token }),
    request('/payroll-runs?status=LOCKED&limit=100', { token }),
  ])
  const drafts = draftListed.data ?? draftListed
  const locked = (lockedListed.data ?? lockedListed).filter(
    (run) => (run.paymentProgress?.paidCount ?? run.paidCount ?? 0) === 0,
  )
  const targets = [...(Array.isArray(drafts) ? drafts : []), ...(Array.isArray(locked) ? locked : [])]
  if (targets.length === 0) {
    console.log('No DRAFT / unpaid LOCKED payroll runs to regenerate.')
    return
  }

  console.log(`Regenerating ${targets.length} run(s)…`)
  for (const run of targets) {
    const updated = await request(`/payroll-runs/${run.id}/regenerate`, {
      method: 'PATCH',
      token,
    })
    console.log(
      `  ${run.id} ${run.year}-${String(run.month).padStart(2, '0')} [${run.status}] → ${updated._count?.lines ?? '?'} lines (rule ${updated.ruleVersion})`,
    )
  }
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
