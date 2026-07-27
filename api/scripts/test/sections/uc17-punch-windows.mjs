import {
  authHeader,
  detail,
  fail,
  localIso,
  pass,
  provisionKiosk,
  request,
  uniqueWeekdayParts,
} from '../helpers.mjs'

const PATRICK_PIN = '1234'

function msgOf(json) {
  return String(json?.message ?? JSON.stringify(json ?? ''))
}

function okVerify(res) {
  return res.status === 200 || res.status === 201
}

export async function runUc17(ctx) {
  const auth = authHeader(ctx.tokens.admin)
  if (!ctx.tokens.admin || !ctx.ids.patrickId) {
    fail(ctx, 'UC-17 Prérequis admin + patrickId')
    return
  }

  const kioskId = ctx.ids.kioskId
  let kioskToken = ctx.tokens.kiosk
  if (!kioskId) {
    const kiosks = await request('/kiosks?page=1&limit=5', { headers: auth })
    ctx.ids.kioskId = kiosks.json?.data?.[0]?.id
  }
  if (!ctx.ids.kioskId) {
    fail(ctx, 'UC-17 Prérequis kiosk')
    return
  }
  if (!kioskToken) {
    const provisioned = await provisionKiosk(ctx.tokens.admin, ctx.ids.kioskId)
    kioskToken = provisioned.token
    ctx.tokens.kiosk = kioskToken
  }
  if (!kioskToken) {
    fail(ctx, 'UC-17 Token kiosk manquant')
    return
  }
  const kioskAuth = authHeader(kioskToken)
  const d = uniqueWeekdayParts(ctx, 0)

  const tooEarly = await request('/auth/mobile/verify-pin', {
    method: 'POST',
    headers: {
      ...kioskAuth,
      'x-idempotency-key': `pin-early-${ctx.unique}`,
    },
    body: JSON.stringify({
      employeeId: ctx.ids.patrickId,
      pin: PATRICK_PIN,
      capturedAt: localIso(d.year, d.month, d.day, 5, 0),
    }),
  })
  if (okVerify(tooEarly.res) && /trop t[oô]t/i.test(msgOf(tooEarly.json))) {
    pass(ctx, 'UC-17 Trop tôt → message refus')
  } else {
    fail(ctx, 'UC-17 Trop tôt', detail(tooEarly.json))
  }

  const checkIn = await request('/auth/mobile/verify-pin', {
    method: 'POST',
    headers: {
      ...kioskAuth,
      'x-idempotency-key': `pin-in-${ctx.unique}`,
    },
    body: JSON.stringify({
      employeeId: ctx.ids.patrickId,
      pin: PATRICK_PIN,
      capturedAt: localIso(d.year, d.month, d.day, 8, 15),
    }),
  })
  if (okVerify(checkIn.res) && /arriv[eé]e|retard/i.test(msgOf(checkIn.json))) {
    pass(ctx, 'UC-17 Check-in dans fenêtre')
  } else {
    fail(ctx, 'UC-17 Check-in fenêtre', detail(checkIn.json))
  }

  const alreadyIn = await request('/auth/mobile/verify-pin', {
    method: 'POST',
    headers: {
      ...kioskAuth,
      'x-idempotency-key': `pin-again-${ctx.unique}`,
    },
    body: JSON.stringify({
      employeeId: ctx.ids.patrickId,
      pin: PATRICK_PIN,
      capturedAt: localIso(d.year, d.month, d.day, 9, 0),
    }),
  })
  if (okVerify(alreadyIn.res) && /d[eé]j[aà].*enregistr/i.test(msgOf(alreadyIn.json))) {
    pass(ctx, 'UC-17 Double arrivée → NONE')
  } else {
    fail(ctx, 'UC-17 Double arrivée', detail(alreadyIn.json))
  }

  const earlyOut = await request('/auth/mobile/verify-pin', {
    method: 'POST',
    headers: {
      ...kioskAuth,
      'x-idempotency-key': `pin-earlyout-${ctx.unique}`,
    },
    body: JSON.stringify({
      employeeId: ctx.ids.patrickId,
      pin: PATRICK_PIN,
      capturedAt: localIso(d.year, d.month, d.day, 15, 0),
    }),
  })
  if (okVerify(earlyOut.res) && /anticip|r[eé]clamation/i.test(msgOf(earlyOut.json))) {
    pass(ctx, 'UC-17 Départ anticipé refusé')
  } else if (okVerify(earlyOut.res) && /pause|reprise/i.test(msgOf(earlyOut.json))) {
    pass(ctx, 'UC-17 Plage pause / reprise (cas limite)')
  } else {
    fail(ctx, 'UC-17 Départ anticipé', detail(earlyOut.json))
  }

  const checkOut = await request('/auth/mobile/verify-pin', {
    method: 'POST',
    headers: {
      ...kioskAuth,
      'x-idempotency-key': `pin-out-${ctx.unique}`,
    },
    body: JSON.stringify({
      employeeId: ctx.ids.patrickId,
      pin: PATRICK_PIN,
      capturedAt: localIso(d.year, d.month, d.day, 17, 30),
    }),
  })
  if (okVerify(checkOut.res) && /fin|d[eé]part|enregistr/i.test(msgOf(checkOut.json))) {
    pass(ctx, 'UC-17 Check-out dans fenêtre')
  } else {
    fail(ctx, 'UC-17 Check-out', detail(checkOut.json))
  }

  const wrongPin = await request('/auth/mobile/verify-pin', {
    method: 'POST',
    headers: kioskAuth,
    body: JSON.stringify({
      employeeId: ctx.ids.patrickId,
      pin: '0000',
      capturedAt: localIso(d.year, d.month, d.day, 8, 20),
    }),
  })
  if (wrongPin.res.status === 401) pass(ctx, 'UC-17 PIN incorrect → 401')
  else fail(ctx, 'UC-17 PIN incorrect', String(wrongPin.res.status))
}
