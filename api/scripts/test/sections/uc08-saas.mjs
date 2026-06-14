import { authHeader, detail, fail, pass, request } from '../helpers.mjs'

export async function runUc08(ctx) {
  const auth = authHeader(ctx.tokens.admin)
  if (!ctx.tokens.admin) {
    fail(ctx, 'UC-08 Prérequis admin token')
    return
  }

  const subs = await request('/subscriptions?page=1&limit=10', { headers: auth })
  if (subs.res.status === 200) pass(ctx, 'UC-08 Abonnements liste')
  else fail(ctx, 'UC-08 Abonnements', String(subs.res.status))

  const configs = await request('/system-config?page=1&limit=10', { headers: auth })
  if (configs.res.status === 200 && (configs.json?.data?.length ?? 0) > 0) {
    pass(ctx, 'UC-08 Config système liste')
    const configId = configs.json.data[0].id
    const patch = await request(`/system-config/${configId}`, {
      method: 'PATCH',
      headers: auth,
      body: JSON.stringify({ minConfidence: 0.75 }),
    })
    if (patch.res.status === 200) pass(ctx, 'UC-08 Config système PATCH')
    else fail(ctx, 'UC-08 Config PATCH', detail(patch.json))
  } else {
    fail(ctx, 'UC-08 Config système liste', detail(configs.json))
  }

  const audit = await request('/audit-logs?page=1&limit=10', { headers: auth })
  if (audit.res.status === 200) pass(ctx, 'UC-08 Journaux audit')
  else fail(ctx, 'UC-08 Audit logs', String(audit.res.status))
}
