import { authHeader, detail, fail, pass, request } from '../helpers.mjs'

export async function runUc06(ctx) {
  const auth = authHeader(ctx.tokens.admin)
  if (!ctx.tokens.admin) {
    fail(ctx, 'UC-06 Prérequis admin token')
    return
  }

  const sheets = await request('/timesheets?page=1&limit=20', { headers: auth })
  if (sheets.res.status === 200 && sheets.json?.data?.length) {
    pass(ctx, 'UC-06 Feuilles de temps liste')
    ctx.ids.timesheetId = sheets.json.data[0].id
  } else {
    fail(ctx, 'UC-06 Feuilles de temps liste', detail(sheets.json))
    return
  }

  const sheetId = ctx.ids.timesheetId
  const detailRes = await request(`/timesheets/${sheetId}`, { headers: auth })
  if (detailRes.res.status === 200) pass(ctx, 'UC-06 Fiche timesheet')
  else fail(ctx, 'UC-06 Fiche timesheet', String(detailRes.res.status))

  const override = await request(`/timesheets/${sheetId}/override`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({
      workedMinutes: 480,
      lateMinutes: 0,
      breakMinutes: 60,
      overtimeMinutes: 0,
      reason: `Correction test UC-06 ${ctx.unique}`,
    }),
  })
  if (override.res.status === 200) pass(ctx, 'UC-06 Correction manuelle timesheet')
  else fail(ctx, 'UC-06 Override timesheet', detail(override.json))

  const overrides = await request(`/timesheets/${sheetId}/overrides`, { headers: auth })
  if (overrides.res.status === 200 && Array.isArray(overrides.json?.data ?? overrides.json)) {
    const rows = overrides.json?.data ?? overrides.json
    const hasManagerEmail = rows.some((row) => row.manager?.email)
    if (hasManagerEmail || rows.length > 0) pass(ctx, 'UC-06 Historique corrections')
    else fail(ctx, 'UC-06 Historique corrections', 'vide')
  } else {
    fail(ctx, 'UC-06 Overrides liste', detail(overrides.json))
  }
}
