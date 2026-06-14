export const BASE = process.env.TIMEGATE_API_URL ?? 'http://127.0.0.1:4001/api/v1'
export const PASS = process.env.TIMEGATE_TEST_PASSWORD ?? 'ChangeMe123!'
export const YEAR = Number(process.env.TIMEGATE_TEST_YEAR ?? 2026)

export function createContext() {
  return {
    results: [],
    tokens: {},
    ids: {},
    unique: Date.now(),
  }
}

export function pass(ctx, label) {
  ctx.results.push({ ok: true, label })
  console.log(`✅ ${label}`)
}

export function fail(ctx, label, detail = '') {
  ctx.results.push({ ok: false, label, detail })
  console.log(`❌ ${label}${detail ? ` — ${detail}` : ''}`)
}

export function authHeader(token) {
  return { Authorization: `Bearer ${token}` }
}

export async function request(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = text
  }
  return { res, json, text }
}

export async function login(email, options = {}) {
  const body = { email, password: PASS, ...options }
  const result = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return result.json?.access_token ?? null
}

export async function employeeLogin(email) {
  const result = await request('/auth/employee/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: PASS }),
  })
  return result.json?.access_token ?? null
}

export async function waitForApi(maxMs = 60_000) {
  const started = Date.now()
  while (Date.now() - started < maxMs) {
    try {
      const res = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'x', password: 'x' }),
      })
      if (res.res.status > 0) return true
    } catch {
      // API not ready
    }
    await sleep(1000)
  }
  return false
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function summarize(ctx) {
  const failed = ctx.results.filter((r) => !r.ok)
  console.log('')
  if (failed.length === 0) {
    console.log(`=== ${ctx.results.length} tests API OK ===`)
    return 0
  }
  console.log(`=== ${failed.length}/${ctx.results.length} tests échoués ===`)
  for (const f of failed) console.log(`  - ${f.label}: ${f.detail}`)
  return 1
}

export function detail(json, max = 300) {
  const text = typeof json === 'string' ? json : JSON.stringify(json)
  return text.length > max ? `${text.slice(0, max)}…` : text
}

/** Timestamp de pointage unique par run (évite le 409 duplicate check-in). */
export function uniqueCheckInTimestamp(ctx, hourUtc = 8) {
  const day = 1 + (ctx.unique % 28)
  const month = 1 + Math.floor((ctx.unique / 28) % 12)
  const sec = ctx.unique % 60
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  const hh = String(hourUtc).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return `${YEAR}-${mm}-${dd}T${hh}:${ss}:00.000Z`
}

export function dateFromIsoTimestamp(iso) {
  return iso.slice(0, 10)
}

export async function ensureDraftPayrollRun(ctx, auth, createdLabel = 'Paie brouillon créée') {
  const list = await request('/payroll-runs?page=1&limit=50', { headers: auth })
  const existing = list.json?.data?.find((r) => r.status === 'DRAFT')
  if (existing) return existing

  const used = new Set((list.json?.data ?? []).map((r) => `${r.year}-${r.month}`))
  for (let yearOffset = 0; yearOffset <= 1; yearOffset += 1) {
    const year = YEAR + yearOffset
    for (let month = 1; month <= 12; month += 1) {
      const key = `${year}-${month}`
      if (used.has(key)) continue
      const created = await request('/payroll-runs', {
        method: 'POST',
        headers: auth,
        body: JSON.stringify({ year, month }),
      })
      if (created.json?.id && created.json?.status === 'DRAFT') {
        pass(ctx, createdLabel)
        return created.json
      }
      if (created.res.status === 409) used.add(key)
    }
  }
  return null
}

export async function ensureLeaveTypeId(auth) {
  const list = await request('/leave-types?page=1&limit=20', { headers: auth })
  const existing = list.json?.data?.[0]?.id
  if (existing) return existing

  const created = await request('/leave-types', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      name: `Test Leave ${Date.now()}`,
      maxDaysPerYear: 22,
    }),
  })
  return created.json?.id ?? null
}

export async function recalculateAttendanceAndTimesheets(auth, { employeeId, from, to }) {
  const days = await request('/attendance/days/recalculate', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ from, to, employeeId }),
  })
  const sheets = await request('/timesheets/recalculate', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ from, to, employeeId }),
  })
  return { days, sheets }
}
