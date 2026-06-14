import { authHeader, fail, pass, request } from '../helpers.mjs'

export async function runUc11(ctx) {
  const auth = authHeader(ctx.tokens.admin)
  if (!ctx.tokens.admin) {
    fail(ctx, 'UC-11 Prérequis admin token')
    return
  }

  const steps = [
    ['GET /employees', '/employees?page=1&limit=5'],
    ['GET /employees/contracts', `/employees/contracts?employeeId=${ctx.ids.patrickId ?? ''}`],
    ['GET /leave-types', '/leave-types?page=1&limit=10'],
    ['GET /holiday-lists', '/holiday-lists?page=1&limit=10'],
    ['GET /timesheets', '/timesheets?page=1&limit=10'],
    ['GET /payroll-runs', '/payroll-runs?page=1&limit=10'],
    ['GET /system-config', '/system-config?page=1&limit=10'],
    ['GET /subscriptions', '/subscriptions?page=1&limit=10'],
    ['GET /audit-logs', '/audit-logs?page=1&limit=10'],
  ]

  for (const [label, path] of steps) {
    const res = await request(path, { headers: auth })
    if (res.res.status === 200) pass(ctx, `UC-11 ${label}`)
    else fail(ctx, `UC-11 ${label}`, String(res.res.status))
  }

  if (ctx.ids.timesheetId) {
    const overrides = await request(`/timesheets/${ctx.ids.timesheetId}/overrides`, {
      headers: auth,
    })
    if (overrides.res.status === 200) pass(ctx, 'UC-11 GET /timesheets/:id/overrides')
    else fail(ctx, 'UC-11 timesheet overrides', String(overrides.res.status))
  }

  if (ctx.ids.payrollRunId) {
    const lines = await request(`/payroll-runs/${ctx.ids.payrollRunId}/lines`, { headers: auth })
    if (lines.res.status === 200) pass(ctx, 'UC-11 GET /payroll-runs/:id/lines')
    else fail(ctx, 'UC-11 payroll lines', String(lines.res.status))
  }
}
