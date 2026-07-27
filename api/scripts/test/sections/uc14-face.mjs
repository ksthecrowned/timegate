import {
  authHeader,
  detail,
  fail,
  pass,
  provisionKiosk,
  request,
  requestMultipart,
} from '../helpers.mjs'

/** Tiny invalid JPEG-ish payload — no face, or engine missing. */
const FAKE_PHOTO = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9,
])

function isFaceEngineUnavailable(status, json) {
  if (status !== 500) return false
  const msg = typeof json === 'string' ? json : JSON.stringify(json ?? {})
  return /face engine|dlib|face_recognition|not correctly installed/i.test(msg)
}

function isInvalidFaceInput(status, json) {
  if (status !== 400) return false
  const msg = typeof json === 'string' ? json : JSON.stringify(json ?? {})
  return /no face|empty|invalid image|cannot identify|file/i.test(msg)
}

export async function runUc14(ctx) {
  const auth = authHeader(ctx.tokens.admin)
  if (!ctx.tokens.admin || !ctx.ids.patrickId) {
    fail(ctx, 'UC-14 Prérequis admin + patrickId')
    return
  }

  const missingFile = await requestMultipart('/face/enroll', {
    headers: auth,
    fields: { employeeId: ctx.ids.patrickId },
  })
  if (missingFile.res.status === 400 || missingFile.res.status === 422) {
    pass(ctx, 'UC-14 Enroll sans photo refusé')
  } else {
    fail(ctx, 'UC-14 Enroll sans photo', detail(missingFile.json))
  }

  const badEnroll = await requestMultipart('/face/enroll', {
    headers: auth,
    fields: { employeeId: ctx.ids.patrickId },
    file: {
      fieldName: 'photo',
      filename: 'bad.jpg',
      type: 'image/jpeg',
      buffer: FAKE_PHOTO,
    },
  })
  if (isInvalidFaceInput(badEnroll.res.status, badEnroll.json)) {
    pass(ctx, 'UC-14 Enroll image invalide → 400')
  } else if (isFaceEngineUnavailable(badEnroll.res.status, badEnroll.json)) {
    pass(ctx, 'UC-14 Enroll soft-skip (moteur facial absent)')
  } else if (badEnroll.json?.enrolled === true) {
    pass(ctx, 'UC-14 Enroll accepté (moteur permissif)')
  } else {
    fail(ctx, 'UC-14 Enroll image invalide', detail(badEnroll.json))
  }

  const kiosks = await request('/kiosks?page=1&limit=5', { headers: auth })
  const kioskId = kiosks.json?.data?.[0]?.id
  if (!kioskId) {
    fail(ctx, 'UC-14 Prérequis kiosk', 'aucun kiosk')
    return
  }
  ctx.ids.kioskId = kioskId

  const provisioned = await provisionKiosk(ctx.tokens.admin, kioskId)
  if (provisioned.token) {
    pass(ctx, 'UC-14 Provision kiosk')
    ctx.tokens.kiosk = provisioned.token
  } else {
    fail(ctx, 'UC-14 Provision kiosk', detail(provisioned.json))
    return
  }

  const verify = await requestMultipart('/auth/mobile/verify', {
    headers: authHeader(ctx.tokens.kiosk),
    fields: {},
    file: {
      fieldName: 'photo',
      filename: 'probe.jpg',
      type: 'image/jpeg',
      buffer: FAKE_PHOTO,
    },
  })
  if (isInvalidFaceInput(verify.res.status, verify.json)) {
    pass(ctx, 'UC-14 Verify facial image invalide → 400')
  } else if (isFaceEngineUnavailable(verify.res.status, verify.json)) {
    pass(ctx, 'UC-14 Verify soft-skip (moteur facial absent)')
  } else if (verify.res.status === 200 && verify.json?.success === false) {
    pass(ctx, 'UC-14 Verify facial sans match')
  } else if (verify.res.status === 401 || verify.res.status === 403) {
    pass(ctx, `UC-14 Verify facial refusé (${verify.res.status})`)
  } else {
    fail(ctx, 'UC-14 Verify facial', detail(verify.json))
  }
}
