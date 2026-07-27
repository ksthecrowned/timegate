import { authHeader, detail, fail, pass, request } from '../helpers.mjs'

const BUDGET_MS = Number(process.env.TIMEGATE_PERF_BUDGET_MS ?? 3000)

async function timed(label, fn) {
  const started = Date.now()
  const result = await fn()
  return { ...result, elapsedMs: Date.now() - started, label }
}

export async function runUc19(ctx) {
  const auth = authHeader(ctx.tokens.admin)
  if (!ctx.tokens.admin) {
    fail(ctx, 'UC-19 Prérequis admin token')
    return
  }

  const probes = [
    await timed('employees', () =>
      request('/employees?page=1&limit=50', { headers: auth }),
    ),
    await timed('attendance-days', () =>
      request('/attendance/days?from=2026-01-01&to=2026-01-31&page=1&limit=50', {
        headers: auth,
      }),
    ),
    await timed('notifications', () =>
      request('/notifications?page=1&limit=50', { headers: auth }),
    ),
    await timed('timesheets', () =>
      request('/timesheets?page=1&limit=50', { headers: auth }),
    ),
  ]

  let allOk = true
  for (const probe of probes) {
    if (probe.res.status !== 200) {
      fail(ctx, `UC-19 ${probe.label} status`, String(probe.res.status))
      allOk = false
      continue
    }
    if (probe.elapsedMs <= BUDGET_MS) {
      pass(ctx, `UC-19 ${probe.label} < ${BUDGET_MS}ms (${probe.elapsedMs}ms)`)
    } else {
      fail(
        ctx,
        `UC-19 ${probe.label} trop lent`,
        `${probe.elapsedMs}ms > ${BUDGET_MS}ms`,
      )
      allOk = false
    }
  }

  const burstStarted = Date.now()
  const burst = await Promise.all([
    request('/branches?page=1&limit=20', { headers: auth }),
    request('/kiosks?page=1&limit=20', { headers: auth }),
    request('/departments?page=1&limit=20', { headers: auth }),
    request('/audit-logs?page=1&limit=20', { headers: auth }),
  ])
  const burstMs = Date.now() - burstStarted
  const burstOk = burst.every((r) => r.res.status === 200)
  if (burstOk && burstMs <= BUDGET_MS * 2) {
    pass(ctx, `UC-19 Burst parallèle OK (${burstMs}ms)`)
  } else if (burstOk) {
    fail(ctx, 'UC-19 Burst trop lent', `${burstMs}ms`)
  } else {
    fail(ctx, 'UC-19 Burst status', detail(burst.map((r) => r.res.status)))
  }

  if (allOk) {
    // marker already covered by per-probe passes
  }
}
