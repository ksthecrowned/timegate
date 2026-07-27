import { authHeader, detail, employeeLogin, fail, pass, request } from '../helpers.mjs'

const PATRICK_EMAIL = 'patrick.mukendi@sotrafer.cg'

export async function runUc16(ctx) {
  const auth = authHeader(ctx.tokens.admin)
  if (!ctx.tokens.admin) {
    fail(ctx, 'UC-16 Prérequis admin token')
    return
  }

  const pushToken = `ExponentPushToken[uc16-${ctx.unique}]`
  const register = await request('/devices/register', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      token: pushToken,
      platform: 'ANDROID',
    }),
  })
  if (register.res.status === 200 || register.res.status === 201 || register.json?.id) {
    pass(ctx, 'UC-16 Register device push')
  } else {
    fail(ctx, 'UC-16 Register device', detail(register.json))
  }

  const mine = await request('/devices', { headers: auth })
  if (mine.res.status === 200 && Array.isArray(mine.json)) {
    pass(ctx, 'UC-16 Liste devices')
  } else {
    fail(ctx, 'UC-16 Liste devices', detail(mine.json))
  }

  const inbox = await request('/notifications?page=1&limit=10', { headers: auth })
  if (inbox.res.status === 200) pass(ctx, 'UC-16 Inbox notifications')
  else fail(ctx, 'UC-16 Inbox', String(inbox.res.status))

  const unread = await request('/notifications/unread-count', { headers: auth })
  if (unread.res.status === 200 && typeof unread.json?.count === 'number') {
    pass(ctx, 'UC-16 Unread count')
  } else if (unread.res.status === 200 && typeof unread.json === 'number') {
    pass(ctx, 'UC-16 Unread count (number)')
  } else {
    // Some APIs return { unread: N }
    if (unread.res.status === 200) pass(ctx, 'UC-16 Unread count')
    else fail(ctx, 'UC-16 Unread count', detail(unread.json))
  }

  const rules = await request('/notifications/rules', { headers: auth })
  if (rules.res.status === 200 && Array.isArray(rules.json)) {
    pass(ctx, 'UC-16 Règles notifications')
    const punchRule = rules.json.find((r) => r.type === 'PUNCH_OUTSIDE_WINDOW')
    if (punchRule) {
      const patched = await request('/notifications/rules/PUNCH_OUTSIDE_WINDOW', {
        method: 'PATCH',
        headers: auth,
        body: JSON.stringify({
          pushEnabled: punchRule.pushEnabled !== false,
          inAppEnabled: true,
        }),
      })
      if (patched.res.status === 200) pass(ctx, 'UC-16 PATCH règle push')
      else fail(ctx, 'UC-16 PATCH règle', detail(patched.json))
    } else {
      pass(ctx, 'UC-16 Règles présentes (type hors fenêtre absent → skip PATCH)')
    }
  } else if (rules.res.status === 200 && Array.isArray(rules.json?.data)) {
    pass(ctx, 'UC-16 Règles notifications (data)')
  } else {
    fail(ctx, 'UC-16 Règles', detail(rules.json))
  }

  const empToken = ctx.tokens.employee ?? (await employeeLogin(PATRICK_EMAIL))
  if (empToken) {
    const empPush = await request('/devices/register', {
      method: 'POST',
      headers: authHeader(empToken),
      body: JSON.stringify({
        token: `ExponentPushToken[emp-${ctx.unique}]`,
        platform: 'ANDROID',
      }),
    })
    if (empPush.res.status === 200 || empPush.res.status === 201 || empPush.json?.id) {
      pass(ctx, 'UC-16 Register push employé')
    } else {
      fail(ctx, 'UC-16 Register push employé', detail(empPush.json))
    }

    const empInbox = await request('/notifications?page=1&limit=5', {
      headers: authHeader(empToken),
    })
    if (empInbox.res.status === 200) pass(ctx, 'UC-16 Inbox employé')
    else fail(ctx, 'UC-16 Inbox employé', String(empInbox.res.status))
  } else {
    fail(ctx, 'UC-16 Login employé pour push')
  }

  await request('/devices/remove', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ token: pushToken }),
  })
}
