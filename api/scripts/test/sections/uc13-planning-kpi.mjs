import { authHeader, detail, fail, pass, request } from '../helpers.mjs'

export async function runUc13(ctx) {
  const auth = authHeader(ctx.tokens.admin)
  if (!ctx.tokens.admin) {
    fail(ctx, 'UC-13 Prérequis admin token')
    return
  }

  const res = await request('/dashboard/planning-vs-actual?from=2026-01-01&to=2026-01-31', {
    headers: auth,
  })
  if (
    res.res.status === 200 &&
    typeof res.json?.plannedMinutes === 'number' &&
    typeof res.json?.workedMinutes === 'number' &&
    Array.isArray(res.json?.byWeek)
  ) {
    pass(ctx, 'UC-13 Planning vs actual')
  } else {
    fail(ctx, 'UC-13 Planning vs actual', detail(res.json))
  }
}
