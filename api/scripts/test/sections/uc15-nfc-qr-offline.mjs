import {
  authHeader,
  detail,
  employeeLogin,
  fail,
  pass,
  provisionKiosk,
  request,
} from '../helpers.mjs'

const PATRICK_EMAIL = 'patrick.mukendi@sotrafer.cg'
const PATRICK_PIN = '1234'

export async function runUc15(ctx) {
  const auth = authHeader(ctx.tokens.admin)
  if (!ctx.tokens.admin || !ctx.ids.patrickId) {
    fail(ctx, 'UC-15 Prérequis admin + patrickId')
    return
  }

  const kiosks = await request('/kiosks?page=1&limit=5', { headers: auth })
  const kioskId = ctx.ids.kioskId ?? kiosks.json?.data?.[0]?.id
  if (!kioskId) {
    fail(ctx, 'UC-15 Prérequis kiosk')
    return
  }
  ctx.ids.kioskId = kioskId

  const enabled = await request(`/kiosks/${kioskId}`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ nfcEnabled: true, qrEnabled: true, faceEnabled: true }),
  })
  if (enabled.res.status === 200) pass(ctx, 'UC-15 Kiosk NFC+QR activés')
  else fail(ctx, 'UC-15 Enable NFC/QR', detail(enabled.json))

  const badgeUid = `TG${String(ctx.unique).slice(-10)}ABCD`
  const badge = await request(`/employees/${ctx.ids.patrickId}/nfc-badge`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ badgeUid }),
  })
  if (badge.res.status === 200 && badge.json?.hasNfcBadge) {
    pass(ctx, 'UC-15 Badge NFC enregistré')
  } else {
    fail(ctx, 'UC-15 Badge NFC', detail(badge.json))
  }

  let kioskToken = ctx.tokens.kiosk
  if (!kioskToken) {
    const provisioned = await provisionKiosk(ctx.tokens.admin, kioskId)
    kioskToken = provisioned.token
    ctx.tokens.kiosk = kioskToken
  }
  if (!kioskToken) {
    fail(ctx, 'UC-15 Token kiosk manquant')
    return
  }
  // Re-provision après enable QR pour garantir qrChallengeSecret
  const reprovision = await provisionKiosk(ctx.tokens.admin, kioskId)
  if (reprovision.token) {
    kioskToken = reprovision.token
    ctx.tokens.kiosk = kioskToken
  }

  const kioskAuth = authHeader(kioskToken)

  const nfcOnline = await request('/auth/kiosk/verify-nfc', {
    method: 'POST',
    headers: kioskAuth,
    body: JSON.stringify({ badgeUid }),
  })
  if ((nfcOnline.res.status === 200 || nfcOnline.res.status === 201) && nfcOnline.json?.success) {
    pass(ctx, 'UC-15 NFC online OK')
  } else {
    fail(ctx, 'UC-15 NFC online', detail(nfcOnline.json))
  }

  const capturedAt = new Date(Date.now() - 5 * 60_000).toISOString()
  const nfcOffline = await request('/auth/kiosk/verify-nfc', {
    method: 'POST',
    headers: {
      ...kioskAuth,
      'x-idempotency-key': `nfc-off-${ctx.unique}`,
    },
    body: JSON.stringify({
      badgeUid,
      offlineSync: '1',
      capturedAt,
    }),
  })
  if (
    (nfcOffline.res.status === 200 || nfcOffline.res.status === 201) &&
    nfcOffline.json?.success &&
    nfcOffline.json?.offlineSync === true
  ) {
    pass(ctx, 'UC-15 NFC offline sync OK')
  } else {
    fail(ctx, 'UC-15 NFC offline', detail(nfcOffline.json))
  }

  const pinOffline = await request('/auth/kiosk/verify-pin', {
    method: 'POST',
    headers: kioskAuth,
    body: JSON.stringify({
      employeeId: ctx.ids.patrickId,
      pin: PATRICK_PIN,
      offlineSync: '1',
      capturedAt,
    }),
  })
  if (
    pinOffline.res.status === 400 &&
    /PIN|connexion en ligne|offline/i.test(String(pinOffline.json?.message ?? JSON.stringify(pinOffline.json)))
  ) {
    pass(ctx, 'UC-15 PIN offline refusé')
  } else {
    fail(ctx, 'UC-15 PIN offline', detail(pinOffline.json))
  }

  const nfcNoCapturedAt = await request('/auth/kiosk/verify-nfc', {
    method: 'POST',
    headers: kioskAuth,
    body: JSON.stringify({ badgeUid, offlineSync: '1' }),
  })
  if (
    nfcNoCapturedAt.res.status === 400 &&
    /capturedAt/i.test(String(nfcNoCapturedAt.json?.message ?? JSON.stringify(nfcNoCapturedAt.json)))
  ) {
    pass(ctx, 'UC-15 NFC offline sans capturedAt → 400')
  } else {
    fail(ctx, 'UC-15 NFC offline sans capturedAt', detail(nfcNoCapturedAt.json))
  }

  const staleAt = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString()
  const nfcStale = await request('/auth/kiosk/verify-nfc', {
    method: 'POST',
    headers: kioskAuth,
    body: JSON.stringify({ badgeUid, offlineSync: '1', capturedAt: staleAt }),
  })
  if (
    nfcStale.res.status === 400 &&
    /trop ancien|ancien/i.test(String(nfcStale.json?.message ?? JSON.stringify(nfcStale.json)))
  ) {
    pass(ctx, 'UC-15 NFC offline trop ancien → 400')
  } else {
    fail(ctx, 'UC-15 NFC offline trop ancien', detail(nfcStale.json))
  }

  const challenge = await request('/auth/kiosk/qr-challenge', {
    method: 'POST',
    headers: kioskAuth,
  })
  if (challenge.res.status === 201 || challenge.json?.payload) {
    pass(ctx, 'UC-15 QR challenge créé')
    ctx.ids.qrChallengeId = challenge.json.id
    ctx.ids.qrPayload = challenge.json.payload
  } else {
    fail(ctx, 'UC-15 QR challenge', detail(challenge.json))
    return
  }

  if (challenge.json?.id) {
    const pending = await request(`/auth/kiosk/qr-challenge/${challenge.json.id}/result`, {
      headers: kioskAuth,
    })
    if (pending.json?.status === 'PENDING') pass(ctx, 'UC-15 QR challenge PENDING')
    else fail(ctx, 'UC-15 QR challenge result', detail(pending.json))
  }

  const empToken = await employeeLogin(PATRICK_EMAIL)
  if (!empToken) {
    fail(ctx, 'UC-15 Login employé pour QR')
    return
  }
  const empAuth = authHeader(empToken)

  const scan = await request('/employee/qr-punch/scan', {
    method: 'POST',
    headers: empAuth,
    body: JSON.stringify({ payload: ctx.ids.qrPayload }),
  })
  if (scan.res.status === 200 || scan.json?.ok === true) {
    pass(ctx, 'UC-15 QR scan online OK')
  } else if (
    scan.res.status === 400 &&
    /fenêtre|trop tôt|déjà|Horaires|anticip/i.test(String(scan.json?.message ?? JSON.stringify(scan.json)))
  ) {
    pass(ctx, 'UC-15 QR scan pipeline OK (rejet fenêtre métier)')
  } else if (scan.res.status === 403) {
    fail(ctx, 'UC-15 QR scan appareil non TRUSTED', detail(scan.json))
  } else {
    fail(ctx, 'UC-15 QR scan', detail(scan.json))
  }

  const challenge2 = await request('/auth/kiosk/qr-challenge', {
    method: 'POST',
    headers: kioskAuth,
  })
  const syncPayload = challenge2.json?.payload
  if (!syncPayload) {
    fail(ctx, 'UC-15 QR challenge #2 pour sync', detail(challenge2.json))
    return
  }

  const syncRecent = await request('/employee/qr-punch/sync', {
    method: 'POST',
    headers: empAuth,
    body: JSON.stringify({
      items: [
        {
          clientId: `c-${ctx.unique}-ok`,
          payload: syncPayload,
          scannedAt: new Date(Date.now() - 10_000).toISOString(),
        },
        {
          clientId: `c-${ctx.unique}-bad`,
          payload: 'TGQR:v3:invalid',
          scannedAt: new Date().toISOString(),
        },
        {
          clientId: `c-${ctx.unique}-stale`,
          payload: syncPayload,
          scannedAt: new Date(Date.now() - 40 * 24 * 60 * 60_000).toISOString(),
        },
      ],
    }),
  })
  const results = syncRecent.json?.results ?? []
  const bad = results.find((r) => r.clientId === `c-${ctx.unique}-bad`)
  const stale = results.find((r) => r.clientId === `c-${ctx.unique}-stale`)
  if (Array.isArray(results) && results.length === 3) {
    pass(ctx, 'UC-15 QR sync batch (3 items)')
  } else {
    fail(ctx, 'UC-15 QR sync batch', detail(syncRecent.json))
  }
  if (bad && bad.ok === false) pass(ctx, 'UC-15 QR sync payload invalide')
  else fail(ctx, 'UC-15 QR sync invalide', detail(bad ?? syncRecent.json))
  if (stale && stale.ok === false) pass(ctx, 'UC-15 QR sync trop ancien')
  else fail(ctx, 'UC-15 QR sync trop ancien', detail(stale ?? syncRecent.json))
}
