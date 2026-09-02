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

/** Identifiant appareil stable par e-mail (1er login → TRUSTED ; réutilisable pour QR). */
export function employeeDeviceInstallId(email) {
  const slug = String(email)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 28)
  const id = `tgtest${slug || 'device'}`
  return id.length >= 8 ? id : `${id}xxxxxxxx`.slice(0, 8)
}

export async function employeeLogin(email, password, options = {}) {
  const result = await request('/auth/employee/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: password ?? PASS,
      deviceInstallId: options.deviceInstallId ?? employeeDeviceInstallId(email),
      platform: options.platform ?? 'ANDROID',
      ...(options.deviceLabel ? { deviceLabel: options.deviceLabel } : { deviceLabel: 'UC test device' }),
    }),
  })
  return result.json?.access_token ?? null
}

/** Multipart (enrôlement facial / verify) — ne pas forcer Content-Type. */
export async function requestMultipart(path, { method = 'POST', headers = {}, fields = {}, file } = {}) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value != null) form.append(key, String(value))
  }
  if (file) {
    const blob = new Blob([file.buffer], { type: file.type || 'application/octet-stream' })
    form.append(file.fieldName || 'photo', blob, file.filename || 'photo.jpg')
  }
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...headers,
    },
    body: form,
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

/** Provisionne une borne et retourne le lifetime_token kiosk. */
export async function provisionKiosk(adminToken, kioskId) {
  const result = await request('/auth/kiosk/provision', {
    method: 'POST',
    headers: authHeader(adminToken),
    body: JSON.stringify({ kioskId }),
  })
  return {
    token: result.json?.lifetime_token ?? null,
    json: result.json,
    status: result.res.status,
  }
}

/** ISO local (aligné dateToMinutes / fenêtres serveur). */
export function localIso(year, month, day, hour, minute = 0, second = 0) {
  return new Date(year, month - 1, day, hour, minute, second, 0).toISOString()
}

/** Prochain jour ouvré (lun–ven) à partir d’un offset unique. */
export function uniqueWeekdayParts(ctx, offsetDays = 0) {
  const base = new Date()
  base.setHours(12, 0, 0, 0)
  base.setDate(base.getDate() + 14 + (ctx.unique % 200) + offsetDays)
  while (base.getDay() === 0 || base.getDay() === 6) {
    base.setDate(base.getDate() + 1)
  }
  return {
    year: base.getFullYear(),
    month: base.getMonth() + 1,
    day: base.getDate(),
  }
}

export async function approvePendingTrustedDevice(adminToken, deviceInstallId) {
  const pending = await request('/trusted-devices/pending', {
    headers: authHeader(adminToken),
  })
  const row = (pending.json?.data ?? []).find((d) => d.deviceInstallId === deviceInstallId)
  if (!row?.id || !row?.employee?.id) return false
  const patched = await request(`/employees/${row.employee.id}/trusted-devices/${row.id}`, {
    method: 'PATCH',
    headers: authHeader(adminToken),
    body: JSON.stringify({ status: 'TRUSTED' }),
  })
  return patched.res.status === 200 || patched.json?.status === 'TRUSTED'
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
