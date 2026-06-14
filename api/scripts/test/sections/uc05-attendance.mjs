import { authHeader, detail, fail, pass, request, uniqueCheckInTimestamp } from '../helpers.mjs'

export async function runUc05(ctx) {
  const auth = authHeader(ctx.tokens.admin)
  if (!ctx.tokens.admin) {
    fail(ctx, 'UC-05 Prérequis admin token')
    return
  }

  const days = await request('/attendance/days?from=2026-01-01&to=2026-01-31&page=1&limit=10', {
    headers: auth,
  })
  if (days.res.status === 200 && Array.isArray(days.json?.data)) {
    pass(ctx, 'UC-05 Jours de présence')
    if (days.json.data[0]?.id) ctx.ids.attendanceDayId = days.json.data[0].id
  } else fail(ctx, 'UC-05 Jours de présence', String(days.res.status))

  const exportRes = await request('/attendance/days/export?from=2026-01-01&to=2026-01-31', {
    headers: auth,
  })
  if (
    exportRes.json?.filename?.includes('attendance-days-2026-01-01_2026-01-31.csv') &&
    exportRes.json?.csv?.includes('date,employeeId')
  ) {
    pass(ctx, 'UC-05 Export CSV présences')
  } else {
    fail(ctx, 'UC-05 Export CSV', detail(exportRes.json))
  }

  const events = await request('/attendance/events?page=1&limit=10', { headers: auth })
  if (events.res.status === 200) pass(ctx, 'UC-05 Événements pointage')
  else fail(ctx, 'UC-05 Événements', String(events.res.status))

  const faceLogs = await request('/face-recognition-logs?page=1&limit=10', { headers: auth })
  if (faceLogs.res.status === 200) pass(ctx, 'UC-05 Journaux reconnaissance')
  else fail(ctx, 'UC-05 Face logs', String(faceLogs.res.status))

  const patrickId = ctx.ids.patrickId
  const kiosks = await request('/kiosks?page=1&limit=5', { headers: auth })
  const kioskId = kiosks.json?.data?.[0]?.id
  if (patrickId && kioskId) {
    const checkin = await request('/attendance', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        employeeId: patrickId,
        kioskId,
        type: 'CHECK_IN',
        confidence: 0.95,
        timestamp: uniqueCheckInTimestamp(ctx),
      }),
    })
    if (checkin.res.status === 201 || checkin.json?.id) pass(ctx, 'UC-05 POST /attendance check-in')
    else fail(ctx, 'UC-05 POST attendance', detail(checkin.json))
  } else {
    fail(ctx, 'UC-05 POST attendance prérequis', 'patrick/kiosk manquant')
  }
}
