import { authHeader, fail, pass, request } from '../helpers.mjs'

export async function runUc09(ctx) {
  if (!ctx.tokens.superAdmin) {
    fail(ctx, 'UC-09 Prérequis super admin token')
    return
  }

  const auth = authHeader(ctx.tokens.superAdmin)
  const orgs = await request('/auth/super-admin/organizations', { headers: auth })
  if (orgs.res.status === 200) {
    const list = Array.isArray(orgs.json) ? orgs.json : orgs.json?.data
    if (Array.isArray(list) && list.length > 0) {
      pass(ctx, 'UC-09 Liste organisations plateforme')
      const org = list.find((o) => o.sku === 'SOTR') ?? list[0]
      const detail = await request(`/auth/super-admin/organizations/${org.id}`, {
        headers: auth,
      })
      if (detail.res.status === 200) pass(ctx, 'UC-09 Fiche organisation')
      else fail(ctx, 'UC-09 Fiche organisation', String(detail.res.status))
    } else {
      fail(ctx, 'UC-09 Organisations vides')
    }
  } else {
    fail(ctx, 'UC-09 Organisations', String(orgs.res.status))
  }

  const stats = await request('/admin-saas/platform-stats', { headers: auth })
  if (stats.res.status === 200) pass(ctx, 'UC-09 Stats plateforme')
  else fail(ctx, 'UC-09 Stats plateforme', String(stats.res.status))
}
